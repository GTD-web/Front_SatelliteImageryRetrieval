'use client';

/**
 * InSAR 분석 요청 통합 Context — query(SWR) + commands + UI/폼 상태 조립
 *
 * - Service 주입 패턴으로 Plan(Mock) / Current(실제 API) 환경 분기.
 * - 가용 scene 카탈로그·기법 적합도(서버 파생)는 useState 로 들지 않고 query(SWR) 결과 전달.
 * - 요청 폼 입력 / 선택 / 지도 그리기 / 모드·탭 등 순수 UI·폼 상태만 useState.
 * - 저장된 AOI(라이브러리)는 이 요청 도메인에 포함하지 않는다. 공유 SavedAoisContext 가
 *   담당하며, UI 패널이 그 훅/컴포넌트를 직접 사용한다(여기서는 ?aoi= 진입 시 1회 조회).
 */
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { aoiToRing, useSavedAois, type SavedAoi } from '@/_shared/contexts/SavedAoisContext';
import { useToast, type MapFootprint, type MapTool } from '@/_ui/hifi';
import type { DrawnGeometry } from '@/_ui/hifi/MapCanvas';

import type { IInsarRequestService } from '../../_services/insar-request.service.interface';
import type { InsarRequestUI } from '../../_mocks/insar-request.ui-interface';
import { ANALYSIS_META, AUTO_PARAMS } from '../../_constants/insar-analysis';
import { buildDefaultRequest, parseAoiFromForm } from '../../_constants/insar-form';
import {
    aoiCenter,
    bboxOverlapPercent,
    computeFootprintsIntersection,
    isLowQualityScene,
    pickReferenceSceneId,
} from '../../_constants/insar-geo';
import { useAvailableScenesQuery } from './queries/use-available-scenes-query';
import { useMethodAssessmentQuery } from './queries/use-method-assessment-query';
import { useRequestCommands } from './commands/use-request-commands';

type RequestForm = InsarRequestUI.RequestForm;
type AnalysisType = InsarRequestUI.AnalysisType;
type AvailableScene = InsarRequestUI.AvailableScene;
type FieldError = InsarRequestUI.FieldError;
type Recommendation = InsarRequestUI.Recommendation;

interface InsarRequestContextValue {
    // 폼 상태
    form: RequestForm;
    updateField: <K extends keyof RequestForm>(key: K, value: RequestForm[K]) => void;
    setRequestType: (t: AnalysisType) => void;
    fieldError: FieldError | null;
    submitting: boolean;

    // 데이터 (SWR)
    availableScenes: AvailableScene[];
    recommendations: Recommendation[] | null;
    fetchingScenes: boolean;

    // scene 선택
    selectedSceneIds: Set<string>;
    selectedScenes: AvailableScene[];
    referenceSceneId: string | null;
    dinsarOverlap: number | null;
    toggleScene: (id: string) => void;
    clearScenes: () => void;
    selectAllScenes: () => void;
    autoExcludeLowQuality: () => void;

    // 지도 / AOI
    requestAoi: Array<[number, number]> | null;
    mapAoi: Array<[number, number]> | null;
    mapFootprints: MapFootprint[];
    initialCenter: [number, number];
    activeTool: MapTool | undefined;
    setActiveTool: React.Dispatch<React.SetStateAction<MapTool | undefined>>;
    fitKey: string;
    setFitKey: (k: string) => void;
    previewAoi: SavedAoi | null;
    handleDrawEnd: (tool: MapTool, geom: DrawnGeometry) => void;
    onAoiChange: ((coords: Array<[number, number]>) => void) | undefined;
    hoveredSceneId: string | null;
    setHoveredSceneId: (id: string | null) => void;

    // AOI 라이브러리 연동(미리보기/적용)
    onAoiHover: (a: SavedAoi | null) => void;
    onAoiApplied: (a: SavedAoi) => void;

    // 기간
    setDateRange: (start: Date, end: Date) => void;

    // commands
    씬_선택으로_진행한다: () => boolean;
    InSAR_요청을_제출한다: () => void;
    추천으로_제출한다: (rec: Recommendation) => void;
    요청을_초기화한다: () => void;
}

const InsarRequestContext = createContext<InsarRequestContextValue | undefined>(undefined);

export function InsarRequestProvider({
    children,
    uiService,
}: {
    children: ReactNode;
    uiService: IInsarRequestService;
}) {
    const toast = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { getById: getSavedAoiById } = useSavedAois();

    // ── 폼 / 선택 / UI 상태 ───────────────────────────────────────────────────
    const [form, setForm] = useState<RequestForm>(() => buildDefaultRequest());
    const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(() => new Set());
    const [previewAoi, setPreviewAoi] = useState<SavedAoi | null>(null);
    const [fitKey, setFitKey] = useState('init');
    const [submitting, setSubmitting] = useState(false);
    const [fieldError, setFieldError] = useState<FieldError | null>(null);
    const [activeTool, setActiveTool] = useState<MapTool | undefined>(undefined);
    const [hoveredSceneId, setHoveredSceneId] = useState<string | null>(null);

    // command 가 항상 최신 폼/선택을 보도록 ref 동기화.
    const formRef = useRef(form);
    formRef.current = form;
    const selectedRef = useRef(selectedSceneIds);
    selectedRef.current = selectedSceneIds;

    // ── 가용 scene 카탈로그 (SWR) ─────────────────────────────────────────────
    const scenesParams = useMemo<InsarRequestUI.AvailableScenesParams>(
        () => ({
            nwLat: form.nwLat,
            nwLon: form.nwLon,
            seLat: form.seLat,
            seLon: form.seLon,
            startDate: form.startDate,
            endDate: form.endDate,
            platform: form.platform,
            s1a: form.s1a,
            s1c: form.s1c,
        }),
        [
            form.nwLat,
            form.nwLon,
            form.seLat,
            form.seLon,
            form.startDate,
            form.endDate,
            form.platform,
            form.s1a,
            form.s1c,
        ],
    );
    const { scenes: availableScenes } = useAvailableScenesQuery({ service: uiService, scenesParams });

    // ── 기법 적합도 (SWR, 자동 모드 추천) ──────────────────────────────────────
    const assessParams = useMemo<InsarRequestUI.AssessParams>(
        () => ({
            nwLat: form.nwLat,
            nwLon: form.nwLon,
            seLat: form.seLat,
            seLon: form.seLon,
            startDate: form.startDate,
            endDate: form.endDate,
        }),
        [form.nwLat, form.nwLon, form.seLat, form.seLon, form.startDate, form.endDate],
    );
    const { recommendations: rawRecs } = useMethodAssessmentQuery({
        service: uiService,
        assessParams,
    });
    const recommendations = rawRecs.length > 0 ? rawRecs : null;

    // ── scene 가져오기 로딩 오버레이 — 기간/AOI/미션이 바뀌면 잠깐 표시 ──────────
    const [fetchingScenes, setFetchingScenes] = useState(false);
    const fetchEnterRef = useRef<number | null>(null);
    const fetchExitRef = useRef<number | null>(null);
    const fetchInitialRef = useRef(true);
    useEffect(() => {
        if (fetchInitialRef.current) {
            fetchInitialRef.current = false;
            return;
        }
        if (fetchEnterRef.current) window.clearTimeout(fetchEnterRef.current);
        if (fetchExitRef.current) window.clearTimeout(fetchExitRef.current);
        setFetchingScenes(false);
        fetchEnterRef.current = window.setTimeout(() => {
            fetchEnterRef.current = null;
            setFetchingScenes(true);
            fetchExitRef.current = window.setTimeout(() => {
                fetchExitRef.current = null;
                setFetchingScenes(false);
            }, 500);
        }, 300);
        return () => {
            if (fetchEnterRef.current) {
                window.clearTimeout(fetchEnterRef.current);
                fetchEnterRef.current = null;
            }
            if (fetchExitRef.current) {
                window.clearTimeout(fetchExitRef.current);
                fetchExitRef.current = null;
            }
        };
    }, [
        form.startDate,
        form.endDate,
        form.platform,
        form.s1a,
        form.s1c,
        form.nwLat,
        form.nwLon,
        form.seLat,
        form.seLon,
    ]);

    // ── ?aoi=<savedAoiId> 진입 처리(mount 1회) ────────────────────────────────
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const aoiParam = searchParams?.get('aoi');
        if (!aoiParam) return;
        const found = getSavedAoiById(aoiParam);
        if (!found) {
            toast('저장된 AOI 를 찾을 수 없습니다', { tone: 'warning' });
        } else {
            setForm((f) => ({
                ...f,
                nwLat: found.nwLat.toFixed(4),
                nwLon: found.nwLon.toFixed(4),
                seLat: found.seLat.toFixed(4),
                seLon: found.seLon.toFixed(4),
            }));
            setSelectedSceneIds(new Set());
            setFitKey(`fit-aoi-${found.id}-${Date.now()}`);
            toast(`"${found.name}" 적용됨`, { tone: 'success' });
        }
        if (pathname) router.replace(pathname);
    }, []);

    // ── 파생값 ────────────────────────────────────────────────────────────────
    const requestAoi = useMemo(
        () => parseAoiFromForm(form),
        [form.nwLat, form.nwLon, form.seLat, form.seLon],
    );

    // SBAS/PSInSAR 은 opt-out 모델 — 범위가 곧 스택이다. 가용 scene 이 바뀌면 "전체 포함".
    // DInSAR 은 사용자가 2장을 직접 고르므로 건드리지 않는다.
    useEffect(() => {
        if (form.type === 'DInSAR') return;
        setSelectedSceneIds(new Set(availableScenes.map((s) => s.id)));
    }, [form.type, availableScenes]);

    // 스택(SBAS/PSInSAR)의 기준 scene — 각 scene B⊥ 는 이 기준 대비로 계산/표시.
    const referenceSceneId = useMemo(
        () => (form.type === 'DInSAR' ? null : pickReferenceSceneId(availableScenes)),
        [form.type, availableScenes],
    );

    const selectedScenes = useMemo(
        () => availableScenes.filter((s) => selectedSceneIds.has(s.id)),
        [availableScenes, selectedSceneIds],
    );

    // DInSAR 모드 + 2개 선택 시 master/slave 풋프린트 겹침 비율 (정보용).
    const dinsarOverlap = useMemo<number | null>(() => {
        if (form.type !== 'DInSAR') return null;
        if (selectedSceneIds.size !== 2) return null;
        const ids = Array.from(selectedSceneIds);
        const a = availableScenes.find((s) => s.id === ids[0]);
        const b = availableScenes.find((s) => s.id === ids[1]);
        if (!a || !b) return null;
        return bboxOverlapPercent(a.footprint, b.footprint);
    }, [form.type, selectedSceneIds, availableScenes]);

    const commonCoverage = useMemo(() => {
        if (selectedScenes.length < 2) return null;
        return computeFootprintsIntersection(selectedScenes.map((s) => s.footprint));
    }, [selectedScenes]);

    // ── scene 선택 조작 ───────────────────────────────────────────────────────
    const toggleScene = useCallback(
        (id: string) => {
            setSelectedSceneIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) {
                    next.delete(id);
                    return next;
                }
                // DInSAR: 정확히 2개 유지. 이미 2개면 마지막 선택을 새 scene 으로 대체.
                if (formRef.current.type === 'DInSAR' && next.size >= 2) {
                    const arr = Array.from(next);
                    const lastId = arr[arr.length - 1];
                    if (lastId !== undefined) next.delete(lastId);
                }
                next.add(id);
                return next;
            });
        },
        [],
    );
    const clearScenes = useCallback(() => setSelectedSceneIds(new Set()), []);

    const selectAllScenes = useCallback(() => {
        if (availableScenes.length === 0) {
            toast('선택할 scene 이 없습니다', { tone: 'warning' });
            return;
        }
        if (form.type === 'DInSAR') {
            const first = availableScenes[0]!;
            const last = availableScenes[availableScenes.length - 1]!;
            if (first.id === last.id) {
                toast('DInSAR 는 두 scene 이 필요합니다 (현재 1개만 가용)', { tone: 'warning' });
                return;
            }
            setSelectedSceneIds(new Set([first.id, last.id]));
            toast(`첫/마지막 scene 페어 선택 (${first.date} → ${last.date})`, { tone: 'success' });
            return;
        }
        setSelectedSceneIds(new Set(availableScenes.map((s) => s.id)));
        toast(`${availableScenes.length}개 scene 모두 선택`, { tone: 'success' });
    }, [availableScenes, form.type, toast]);

    // SBAS/PSInSAR opt-out — 기준 대비 |B⊥| 가 큰 불량일을 스택에서 일괄 제외.
    const autoExcludeLowQuality = useCallback(() => {
        const refPerp = availableScenes.find((s) => s.id === referenceSceneId)?.perpBaseline ?? 0;
        const keep = availableScenes.filter((s) => !isLowQualityScene(s, refPerp));
        const removed = availableScenes.length - keep.length;
        setSelectedSceneIds(new Set(keep.map((s) => s.id)));
        if (removed > 0) {
            toast(`품질 낮은 ${removed}개 날짜를 제외했습니다`, { tone: 'success' });
        } else {
            toast('제외할 불량일이 없습니다');
        }
    }, [availableScenes, referenceSceneId, toast]);

    // ── 지도 풋프린트 ─────────────────────────────────────────────────────────
    const requestFootprints = useMemo<MapFootprint[]>(() => {
        const out: MapFootprint[] = [];
        if (selectedScenes.length === 1) {
            const s = selectedScenes[0]!;
            out.push({
                id: s.id,
                coords: s.footprint,
                kind: 'have',
                label: `${s.date} · ${s.mission}`,
                active: true,
                onClick: () => toggleScene(s.id),
            });
        } else if (selectedScenes.length >= 2) {
            // DInSAR 는 선택한 2장 풋프린트를 모두 그린다. SBAS/PSInSAR 은 스택이 수십~수백 장이라
            // 개별 풋프린트 대신 공통 관측 영역만 표시한다(지도 과밀 방지).
            if (form.type === 'DInSAR') {
                for (const s of selectedScenes) {
                    out.push({
                        id: s.id,
                        coords: s.footprint,
                        kind: 'candidate',
                        onClick: () => toggleScene(s.id),
                    });
                }
            }
            if (commonCoverage) {
                out.push({
                    id: '__common-coverage',
                    coords: commonCoverage,
                    kind: 'common',
                    label: `공통 관측 영역 · ${selectedScenes.length} scenes`,
                    active: true,
                });
            }
        }
        if (hoveredSceneId) {
            const s = availableScenes.find((x) => x.id === hoveredSceneId);
            if (s && !selectedSceneIds.has(s.id)) {
                out.push({
                    id: `${s.id}__hover`,
                    coords: s.footprint,
                    kind: 'have',
                    label: `${s.date} · ${s.mission}`,
                    onClick: () => toggleScene(s.id),
                });
            }
        }
        return out;
    }, [
        availableScenes,
        selectedScenes,
        commonCoverage,
        hoveredSceneId,
        selectedSceneIds,
        form.type,
        toggleScene,
    ]);

    const requestAoiCenter = aoiCenter(requestAoi);
    const initialCenter: [number, number] = requestAoi
        ? (requestAoiCenter ?? [129.37, 36.02])
        : [129.37, 36.02];

    const mapAoi = previewAoi ? aoiToRing(previewAoi) : requestAoi;
    const mapFootprints = previewAoi ? [] : requestFootprints;

    // ── 지도에서 AOI 그리기/편집 ──────────────────────────────────────────────
    const applyAoiFromRing = useCallback((ring: Array<[number, number]>) => {
        let minLon = Infinity,
            maxLon = -Infinity,
            minLat = Infinity,
            maxLat = -Infinity;
        for (const [lon, lat] of ring) {
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        }
        if (!Number.isFinite(minLon)) return;
        setForm((f) => ({
            ...f,
            nwLat: maxLat.toFixed(4),
            nwLon: minLon.toFixed(4),
            seLat: minLat.toFixed(4),
            seLon: maxLon.toFixed(4),
        }));
        setSelectedSceneIds(new Set());
    }, []);

    const handleDrawEnd = useCallback(
        (_tool: MapTool, geom: DrawnGeometry) => {
            if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
                const ring = (geom.coordinates as number[][][])[0];
                if (ring && ring.length >= 3) {
                    const coords = ring.map(([lon, lat]) => [lon, lat] as [number, number]);
                    applyAoiFromRing(coords);
                    toast('AOI 적용됨', { tone: 'success' });
                }
            }
            setActiveTool(undefined);
        },
        [applyAoiFromRing, toast],
    );

    const onAoiChange = useMemo(
        () => (previewAoi ? undefined : (coords: Array<[number, number]>) => applyAoiFromRing(coords)),
        [previewAoi, applyAoiFromRing],
    );

    // ESC 로 draw 모드 취소
    useEffect(() => {
        if (activeTool !== 'bbox' && activeTool !== 'polygon') return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveTool(undefined);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [activeTool]);

    // ── 폼 조작 ───────────────────────────────────────────────────────────────
    const updateField = useCallback(
        <K extends keyof RequestForm>(key: K, value: RequestForm[K]) => {
            setForm((f) => ({ ...f, [key]: value }));
        },
        [],
    );

    const setRequestType = useCallback((t: AnalysisType) => {
        // 유형을 바꾸면 해당 유형의 권장 파라미터를 자동 적용한다(사용자 입력 없음).
        setForm((f) => ({ ...f, type: t, ...AUTO_PARAMS[t], referenceMode: 'auto' }));
        if (t === 'DInSAR') {
            setSelectedSceneIds((prev) => {
                if (prev.size <= 2) return prev;
                const arr = Array.from(prev).slice(0, 2);
                return new Set(arr);
            });
        }
    }, []);

    const setDateRange = useCallback((start: Date, end: Date) => {
        setForm((f) => ({ ...f, startDate: start, endDate: end, datePreset: '' }));
    }, []);

    // 저장된 AOI 미리보기/적용 (라이브러리 호버 시 지도에만 임시 표시).
    const onAoiHover = useCallback((a: SavedAoi | null) => {
        setPreviewAoi((prev) => {
            if (a) {
                setFitKey(`preview-${a.id}-${Date.now()}`);
                return a;
            }
            if (prev) setFitKey(`back-${Date.now()}`);
            return null;
        });
    }, []);
    const onAoiApplied = useCallback((a: SavedAoi) => {
        setPreviewAoi(null);
        setFitKey(`fit-aoi-${a.id}-${Date.now()}`);
    }, []);

    // ── commands ──────────────────────────────────────────────────────────────
    const commands = useRequestCommands({
        service: uiService,
        getForm: () => formRef.current,
        getSelectedSceneIds: () => selectedRef.current,
        setForm,
        setSelectedSceneIds,
        setFieldError,
        setSubmitting,
    });

    // 폼/선택이 바뀌면 인라인 에러 해제 — 사용자가 고치기 시작하면 사라지도록.
    useEffect(() => {
        setFieldError(null);
    }, [form, selectedSceneIds]);

    const value = useMemo<InsarRequestContextValue>(
        () => ({
            form,
            updateField,
            setRequestType,
            fieldError,
            submitting,
            availableScenes,
            recommendations,
            fetchingScenes,
            selectedSceneIds,
            selectedScenes,
            referenceSceneId,
            dinsarOverlap,
            toggleScene,
            clearScenes,
            selectAllScenes,
            autoExcludeLowQuality,
            requestAoi,
            mapAoi,
            mapFootprints,
            initialCenter,
            activeTool,
            setActiveTool,
            fitKey,
            setFitKey,
            previewAoi,
            handleDrawEnd,
            onAoiChange,
            hoveredSceneId,
            setHoveredSceneId,
            onAoiHover,
            onAoiApplied,
            setDateRange,
            씬_선택으로_진행한다: commands.씬_선택으로_진행한다,
            InSAR_요청을_제출한다: () => {
                void commands.InSAR_요청을_제출한다();
            },
            추천으로_제출한다: (rec: Recommendation) => {
                void commands.추천으로_제출한다(rec);
            },
            요청을_초기화한다: commands.요청을_초기화한다,
        }),
        [
            form,
            updateField,
            setRequestType,
            fieldError,
            submitting,
            availableScenes,
            recommendations,
            fetchingScenes,
            selectedSceneIds,
            selectedScenes,
            referenceSceneId,
            dinsarOverlap,
            toggleScene,
            clearScenes,
            selectAllScenes,
            autoExcludeLowQuality,
            requestAoi,
            mapAoi,
            mapFootprints,
            initialCenter,
            activeTool,
            fitKey,
            previewAoi,
            handleDrawEnd,
            onAoiChange,
            hoveredSceneId,
            onAoiHover,
            onAoiApplied,
            setDateRange,
            commands,
        ],
    );

    return <InsarRequestContext.Provider value={value}>{children}</InsarRequestContext.Provider>;
}

export function useInsarRequestContext(): InsarRequestContextValue {
    const ctx = useContext(InsarRequestContext);
    if (ctx == null) {
        throw new Error('useInsarRequestContext는 InsarRequestProvider 내부에서만 사용할 수 있습니다.');
    }
    return ctx;
}
