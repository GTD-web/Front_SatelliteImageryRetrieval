'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
    DateRangePicker,
    Icon,
    InfoTip,
    MapCanvas,
    useToast,
    type MapFootprint,
    type MapTool,
} from '@/_ui/hifi';

import { aoiToRing, useSavedAois, type SavedAoi } from '@/_shared/contexts/SavedAoisContext';
import {
    assessAoi,
    LANDCOVER_META,
    QUALITY_META,
    type AoiAssessment,
    type LandcoverKey,
} from '@/_shared/aoi-assess';
import { LoadAoiMenu, SaveAoiButton } from '../../../_components/SavedAoiControls';
import { RequestTimelinePanel } from '../../../_components/SceneTimelinePanel';

import { LabeledInput, NumberField, Section, typeBadge } from '../_shared';

// ────────────────────────────────────────────────────────────────────────────
// 분석 요청 (request) 모델
// ────────────────────────────────────────────────────────────────────────────

type AnalysisType = 'DInSAR' | 'PSInSAR' | 'SBAS';

const ANALYSIS_META: Record<
    AnalysisType,
    { label: string; sub: string; minScenes: number; sceneRequirement: string }
> = {
    DInSAR: {
        label: 'DInSAR',
        sub: 'Differential — 두 시점 간 변위(이벤트 기반)',
        minScenes: 2,
        sceneRequirement: 'scene 2개 (master + slave)',
    },
    PSInSAR: {
        label: 'PSInSAR',
        sub: 'Persistent Scatterer — 도시·구조물 장기 변위',
        minScenes: 20,
        sceneRequirement: 'scene 20개 이상',
    },
    SBAS: {
        label: 'SBAS',
        sub: 'Small Baseline Subset — 분산형 산란체 시계열',
        minScenes: 15,
        sceneRequirement: 'scene 15개 이상',
    },
};

interface RequestForm {
    name: string;
    type: AnalysisType;
    nwLat: string;
    nwLon: string;
    seLat: string;
    seLon: string;
    startDate: Date;
    endDate: Date;
    s1a: boolean;
    s1c: boolean;
    polarization: string;
    layers: Set<string>;
    coherenceMin: number;
    temporalBaselineMaxDays: number;
    spatialBaselineMaxM: number;
    minScenes: number;
    referenceLon: string;
    referenceLat: string;
}

function buildDefaultRequest(): RequestForm {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setMonth(end.getMonth() - 6);
    return {
        name: '',
        type: 'DInSAR',
        nwLat: '36.10',
        nwLon: '129.30',
        seLat: '35.95',
        seLon: '129.45',
        startDate: start,
        endDate: end,
        s1a: true,
        s1c: false,
        polarization: 'VV+VH',
        layers: new Set(['mean_velocity', 'coherence']),
        coherenceMin: 0.3,
        temporalBaselineMaxDays: 60,
        spatialBaselineMaxM: 200,
        minScenes: 20,
        referenceLon: '',
        referenceLat: '',
    };
}

function parseAoiFromForm(f: RequestForm): Array<[number, number]> | null {
    const nlat = parseFloat(f.nwLat);
    const nlon = parseFloat(f.nwLon);
    const slat = parseFloat(f.seLat);
    const slon = parseFloat(f.seLon);
    if (![nlat, nlon, slat, slon].every(Number.isFinite)) return null;
    if (nlat <= slat || slon <= nlon) return null;
    return [
        [nlon, nlat],
        [slon, nlat],
        [slon, slat],
        [nlon, slat],
        [nlon, nlat],
    ];
}

/**
 * 두 풋프린트(폴리곤 ring) 의 겹침 비율을 bbox 근사로 계산.
 * 결과 = (교집합 면적 / 더 작은 쪽 풋프린트 면적) × 100. 0 ~ 100.
 */
function bboxOverlapPercent(
    a: Array<[number, number]>,
    b: Array<[number, number]>,
): number {
    if (!a.length || !b.length) return 0;
    const bb = (ring: Array<[number, number]>) => {
        let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
        for (const [lon, lat] of ring) {
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        }
        return { minLon, maxLon, minLat, maxLat };
    };
    const A = bb(a);
    const B = bb(b);
    const ix0 = Math.max(A.minLon, B.minLon);
    const ix1 = Math.min(A.maxLon, B.maxLon);
    const iy0 = Math.max(A.minLat, B.minLat);
    const iy1 = Math.min(A.maxLat, B.maxLat);
    if (ix1 <= ix0 || iy1 <= iy0) return 0;
    const inter = (ix1 - ix0) * (iy1 - iy0);
    const aArea = (A.maxLon - A.minLon) * (A.maxLat - A.minLat);
    const bArea = (B.maxLon - B.minLon) * (B.maxLat - B.minLat);
    if (aArea <= 0 || bArea <= 0) return 0;
    return (inter / Math.min(aArea, bArea)) * 100;
}

/**
 * 여러 풋프린트(축 정렬 bbox 가정)의 공통 교집합을 폴리곤 ring 으로 반환.
 * 어느 한 쌍이라도 교차하지 않으면 null.
 */
function computeFootprintsIntersection(
    footprints: Array<Array<[number, number]>>,
): Array<[number, number]> | null {
    if (footprints.length === 0) return null;
    let minLon = -Infinity, maxLon = Infinity, minLat = -Infinity, maxLat = Infinity;
    for (const fp of footprints) {
        if (!fp.length) return null;
        let fMinLon = Infinity, fMaxLon = -Infinity, fMinLat = Infinity, fMaxLat = -Infinity;
        for (const [lon, lat] of fp) {
            if (lon < fMinLon) fMinLon = lon;
            if (lon > fMaxLon) fMaxLon = lon;
            if (lat < fMinLat) fMinLat = lat;
            if (lat > fMaxLat) fMaxLat = lat;
        }
        minLon = Math.max(minLon, fMinLon);
        maxLon = Math.min(maxLon, fMaxLon);
        minLat = Math.max(minLat, fMinLat);
        maxLat = Math.min(maxLat, fMaxLat);
    }
    if (maxLon <= minLon || maxLat <= minLat) return null;
    return [
        [minLon, maxLat],
        [maxLon, maxLat],
        [maxLon, minLat],
        [minLon, minLat],
        [minLon, maxLat],
    ];
}

function aoiCenter(aoi: Array<[number, number]> | null): [number, number] | null {
    if (!aoi || aoi.length < 3) return null;
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lon, lat] of aoi) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }
    return [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
}

interface AvailableScene {
    id: string;
    date: string;
    isoDate: string;
    mission: 'S1A' | 'S1C';
    pass: 'ASC' | 'DESC';
    /** 가상 perpendicular baseline (m), -200~+200 범위 */
    perpBaseline: number;
    footprint: Array<[number, number]>;
}

/**
 * AOI + 기간 + 미션 선택을 기반으로 모킹된 사용 가능한 scene 리스트를 생성한다.
 */
function generateAvailableScenes(form: RequestForm): AvailableScene[] {
    const aoi = parseAoiFromForm(form);
    if (!aoi) return [];
    const missions: ('S1A' | 'S1C')[] = [];
    if (form.s1a) missions.push('S1A');
    if (form.s1c) missions.push('S1C');
    if (missions.length === 0) return [];
    const day = 24 * 60 * 60 * 1000;
    // 고정 anchor 기준 cadence — startDate 가 바뀌어도 각 scene 의 절대 위치(t, id, perp, offset) 는 불변.
    const ANCHOR = new Date(2024, 0, 1).getTime();
    const stepMs = (12 / missions.length) * day;
    const startT = form.startDate.getTime();
    const endT = form.endDate.getTime();
    const firstIdx = Math.max(0, Math.ceil((startT - ANCHOR) / stepMs));
    const lastIdx = Math.floor((endT - ANCHOR) / stepMs);
    const out: AvailableScene[] = [];
    for (let i = firstIdx; i <= lastIdx && out.length < 400; i++) {
        const t = ANCHOR + i * stepMs;
        const m = missions[i % missions.length]!;
        const d = new Date(t);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const perp = Math.round(Math.sin(i * 1.7) * 180);
        const offsetLon = ((i % 7) - 3) * 0.006;
        const offsetLat = ((i % 5) - 2) * 0.004;
        const fp: Array<[number, number]> = aoi.map(
            ([lon, lat]) => [lon + offsetLon, lat + offsetLat] as [number, number],
        );
        out.push({
            id: `${m}_IW_SLC__1SDV_${yyyy}${mm}${dd}T211515_${i}`,
            date: `${yyyy}-${mm}-${dd}`,
            isoDate: `${yyyy}-${mm}-${dd}`,
            mission: m,
            pass: i % 2 === 0 ? 'ASC' : 'DESC',
            perpBaseline: perp,
            footprint: fp,
        });
    }
    return out;
}

// ────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────────────────────

export default function InsarRequestPage() {
    // useSearchParams 가 SSR 시 Suspense 경계를 요구.
    return (
        <Suspense fallback={null}>
            <InsarRequestPageInner />
        </Suspense>
    );
}

function InsarRequestPageInner() {
    const toast = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { getById: getSavedAoiById } = useSavedAois();

    const [request, setRequest] = useState<RequestForm>(() => buildDefaultRequest());
    const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(() => new Set());
    /** 저장된 AOI 메뉴에서 호버 중인 항목. 지도에 임시로 그려지지만 폼/요청 상태는 변하지 않음. */
    const [previewAoi, setPreviewAoi] = useState<SavedAoi | null>(null);
    /** MapCanvas 의 fit 트리거 — 변경 시 AOI/풋프린트에 맞춰 줌인 애니메이션. */
    const [fitKey, setFitKey] = useState('init');
    const [submitting, setSubmitting] = useState(false);
    const [activeTool, setActiveTool] = useState<MapTool | undefined>(undefined);
    const [hoveredSceneId, setHoveredSceneId] = useState<string | null>(null);

    // ?aoi=<savedAoiId> 로 진입한 경우 라이브러리에서 찾아 폼에 적용. mount 1 회만 실행.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const aoiParam = searchParams?.get('aoi');
        if (!aoiParam) return;
        const found = getSavedAoiById(aoiParam);
        if (!found) {
            toast('저장된 AOI 를 찾을 수 없습니다', { tone: 'warning' });
        } else {
            setRequest((f) => ({
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

    // 기간/AOI/미션이 바뀌면 사용 가능한 scene 을 다시 가져오는 척 — 지도 위에 로딩 오버레이.
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
        request.startDate,
        request.endDate,
        request.s1a,
        request.s1c,
        request.nwLat,
        request.nwLon,
        request.seLat,
        request.seLon,
    ]);

    const requestAoi = useMemo(() => parseAoiFromForm(request), [
        request.nwLat, request.nwLon, request.seLat, request.seLon,
    ]);
    const availableScenes = useMemo(() => generateAvailableScenes(request), [
        request.startDate, request.endDate, request.s1a, request.s1c,
        request.nwLat, request.nwLon, request.seLat, request.seLon,
    ]);

    // DInSAR 모드 + 2개 선택 시 master/slave 풋프린트 겹침 비율 (정보용).
    const dinsarOverlap = useMemo<number | null>(() => {
        if (request.type !== 'DInSAR') return null;
        if (selectedSceneIds.size !== 2) return null;
        const ids = Array.from(selectedSceneIds);
        const a = availableScenes.find((s) => s.id === ids[0]);
        const b = availableScenes.find((s) => s.id === ids[1]);
        if (!a || !b) return null;
        return bboxOverlapPercent(a.footprint, b.footprint);
    }, [request.type, selectedSceneIds, availableScenes]);

    const toggleSceneSelection = (id: string) => {
        setSelectedSceneIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                return next;
            }
            // DInSAR: 정확히 2개 유지. 이미 2개가 선택돼 있으면 가장 마지막에 선택했던 scene 을
            // 새로 누른 scene 으로 대체.
            if (request.type === 'DInSAR' && next.size >= 2) {
                const arr = Array.from(next);
                const lastId = arr[arr.length - 1];
                if (lastId !== undefined) next.delete(lastId);
            }
            next.add(id);
            return next;
        });
    };
    const clearSelectedScenes = () => setSelectedSceneIds(new Set());

    const selectAllScenes = () => {
        if (availableScenes.length === 0) {
            toast('선택할 scene 이 없습니다', { tone: 'warning' });
            return;
        }
        if (request.type === 'DInSAR') {
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
    };

    const initialCenter: [number, number] = requestAoi
        ? aoiCenter(requestAoi) ?? [129.37, 36.02]
        : [129.37, 36.02];

    const selectedScenes = useMemo(
        () => availableScenes.filter((s) => selectedSceneIds.has(s.id)),
        [availableScenes, selectedSceneIds],
    );
    const commonCoverage = useMemo(() => {
        if (selectedScenes.length < 2) return null;
        return computeFootprintsIntersection(selectedScenes.map((s) => s.footprint));
    }, [selectedScenes]);

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
                onClick: () => toggleSceneSelection(s.id),
            });
        } else if (selectedScenes.length >= 2) {
            for (const s of selectedScenes) {
                out.push({
                    id: s.id,
                    coords: s.footprint,
                    kind: 'candidate',
                    onClick: () => toggleSceneSelection(s.id),
                });
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
                    onClick: () => toggleSceneSelection(s.id),
                });
            }
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableScenes, selectedScenes, commonCoverage, hoveredSceneId, selectedSceneIds]);

    const mapAoi = previewAoi ? aoiToRing(previewAoi) : requestAoi;
    const mapFootprints = previewAoi ? [] : requestFootprints;

    // ── 지도에서 AOI 그리기/편집 ───────────────────────────────────────
    const applyAoiFromRing = (ring: Array<[number, number]>) => {
        let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
        for (const [lon, lat] of ring) {
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        }
        if (!Number.isFinite(minLon)) return;
        setRequest((f) => ({
            ...f,
            nwLat: maxLat.toFixed(4),
            nwLon: minLon.toFixed(4),
            seLat: minLat.toFixed(4),
            seLon: maxLon.toFixed(4),
        }));
        setSelectedSceneIds(new Set());
    };
    const handleMapDrawEnd = (
        _tool: MapTool,
        geom: { type: string; coordinates: unknown },
    ) => {
        if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
            const ring = (geom.coordinates as number[][][])[0];
            if (ring && ring.length >= 3) {
                const coords = ring.map(([lon, lat]) => [lon, lat] as [number, number]);
                applyAoiFromRing(coords);
                toast('AOI 적용됨', { tone: 'success' });
            }
        }
        setActiveTool(undefined);
    };
    const handleMapAoiEdit = (coords: Array<[number, number]>) => {
        applyAoiFromRing(coords);
    };

    // ESC 로 draw 모드 취소
    useEffect(() => {
        if (activeTool !== 'bbox' && activeTool !== 'polygon') return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveTool(undefined);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [activeTool]);

    // ── 폼 조작/제출 ──────────────────────────────────────────────────
    const updateRequest = <K extends keyof RequestForm>(key: K, value: RequestForm[K]) => {
        setRequest((f) => ({ ...f, [key]: value }));
    };
    const setRequestType = (t: AnalysisType) => {
        setRequest((f) => {
            const base = { ...f, type: t };
            if (t === 'DInSAR') return { ...base, minScenes: 2, coherenceMin: 0.5 };
            if (t === 'PSInSAR') return { ...base, minScenes: 20, coherenceMin: 0.7 };
            return { ...base, minScenes: 15, coherenceMin: 0.3 };
        });
        if (t === 'DInSAR') {
            setSelectedSceneIds((prev) => {
                if (prev.size <= 2) return prev;
                const arr = Array.from(prev).slice(0, 2);
                return new Set(arr);
            });
        }
    };
    const toggleRequestLayer = (k: string) => {
        setRequest((f) => {
            const next = new Set(f.layers);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return { ...f, layers: next };
        });
    };
    const validateRequest = (): string | null => {
        if (!request.name.trim()) return '분석 이름을 입력해주세요';
        if (!requestAoi) return 'AOI 좌표를 확인해주세요 (NW 가 SE 보다 북서쪽이어야 합니다)';
        if (!request.s1a && !request.s1c) return '미션을 하나 이상 선택해주세요';
        if (request.layers.size === 0) return '산출 레이어를 하나 이상 선택해주세요';
        const minSel = ANALYSIS_META[request.type].minScenes;
        if (selectedSceneIds.size < minSel) {
            return `${request.type} 는 최소 ${minSel}개 scene 이 필요합니다 (현재 ${selectedSceneIds.size}개)`;
        }
        if (request.type === 'PSInSAR' && (!request.referenceLon || !request.referenceLat)) {
            return 'PSInSAR 는 reference point 가 필요합니다';
        }
        return null;
    };
    const submitRequest = () => {
        const err = validateRequest();
        if (err) {
            toast(err, { tone: 'warning' });
            return;
        }
        setSubmitting(true);
        window.setTimeout(() => {
            setSubmitting(false);
            toast(
                `${request.type} "${request.name}" — ${selectedSceneIds.size}개 scene 으로 요청 접수`,
                { tone: 'success', title: '요청 접수' },
            );
            setSelectedSceneIds(new Set());
            router.push('/plan/sar/user/insar/results');
        }, 700);
    };
    const resetRequest = () => {
        setRequest(buildDefaultRequest());
        setSelectedSceneIds(new Set());
        toast('요청 폼 초기화됨');
    };

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <div className="split" style={{ flex: 1 }}>
                <aside
                    className="split__side split__side--left"
                    style={{ width: 360, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                >
                    <RequestSidebar
                        form={request}
                        onChangeField={updateRequest}
                        onChangeType={setRequestType}
                        onToggleLayer={toggleRequestLayer}
                        selectedCount={selectedSceneIds.size}
                        availableCount={availableScenes.length}
                        submitting={submitting}
                        onSubmit={submitRequest}
                        onReset={resetRequest}
                        dinsarOverlap={dinsarOverlap}
                        onAoiHover={(a) => {
                            setPreviewAoi((prev) => {
                                if (a) {
                                    setFitKey(`preview-${a.id}-${Date.now()}`);
                                    return a;
                                }
                                if (prev) setFitKey(`back-${Date.now()}`);
                                return null;
                            });
                        }}
                        onAoiApplied={(a) => {
                            setPreviewAoi(null);
                            setFitKey(`fit-aoi-${a.id}-${Date.now()}`);
                        }}
                        scenes={availableScenes}
                        selectedSceneIds={selectedSceneIds}
                        onToggleScene={toggleSceneSelection}
                        onSelectAllScenes={selectAllScenes}
                        onClearScenes={clearSelectedScenes}
                        hoveredSceneId={hoveredSceneId}
                        onHoverScene={setHoveredSceneId}
                    />
                </aside>

                <div className="split__main">
                    <div style={{ flex: 1, position: 'relative', minHeight: 200, isolation: 'isolate' }}>
                        <MapCanvas
                            center={initialCenter}
                            zoom={10}
                            aoi={mapAoi}
                            footprints={mapFootprints}
                            tools={['bbox']}
                            activeTool={activeTool}
                            onToolSelect={setActiveTool}
                            onDrawEnd={handleMapDrawEnd}
                            // preview 중에는 사용자가 지도에서 AOI 를 드래그/리사이즈해도 무시.
                            onAoiChange={!previewAoi ? handleMapAoiEdit : undefined}
                            showLegend={false}
                            fitKey={fitKey}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: 12,
                                    left: 12,
                                    padding: '6px 10px',
                                    background: 'var(--bg-2)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    boxShadow: 'var(--shadow-md)',
                                    pointerEvents: 'none',
                                    zIndex: 3,
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4,
                                    lineHeight: 1.3,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: 18,
                                            height: 0,
                                            borderTop: '1.5px dashed #818cf8',
                                        }}
                                    />
                                    <span>AOI 영역</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: 18,
                                            height: 0,
                                            borderTop: '1.5px solid #10b981',
                                        }}
                                    />
                                    <span>공통 커버리지</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: 18,
                                            height: 0,
                                            borderTop: '1.5px solid #22d3ee',
                                        }}
                                    />
                                    <span>선택/hover scene</span>
                                </div>
                            </div>
                            {activeTool === 'bbox' ? (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 12,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        padding: '8px 14px',
                                        background: 'var(--accent)',
                                        color: '#fff',
                                        borderRadius: 6,
                                        fontSize: 12.5,
                                        fontWeight: 500,
                                        boxShadow: 'var(--shadow-md)',
                                        zIndex: 5,
                                        pointerEvents: 'none',
                                    }}
                                >
                                    지도에서 드래그해 사각형 AOI 를 그리세요 · ESC 로 취소
                                </div>
                            ) : null}
                        </MapCanvas>
                        {/* scene 가져오기 로딩 오버레이 */}
                        <div
                            aria-live="polite"
                            aria-hidden={!fetchingScenes}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(15, 18, 22, 0.45)',
                                backdropFilter: fetchingScenes ? 'blur(2px)' : 'blur(0px)',
                                zIndex: 10,
                                opacity: fetchingScenes ? 1 : 0,
                                pointerEvents: fetchingScenes ? 'all' : 'none',
                                transition: 'opacity 220ms ease, backdrop-filter 220ms ease',
                            }}
                        >
                            <div
                                className="row gap-2"
                                style={{
                                    background: 'var(--bg-2)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: 6,
                                    padding: '10px 16px',
                                    fontSize: 13,
                                    boxShadow: 'var(--shadow-md)',
                                    alignItems: 'center',
                                }}
                            >
                                <span
                                    aria-hidden
                                    style={{
                                        display: 'inline-block',
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        border: '2px solid var(--accent)',
                                        borderTopColor: 'transparent',
                                        animation: 'spin 0.8s linear infinite',
                                    }}
                                />
                                <span>사용 가능한 scene 가져오는 중…</span>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            flexShrink: 0,
                            borderTop: '1px solid var(--border-subtle)',
                            background: 'var(--bg-2)',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            zIndex: 9,
                        }}
                    >
                        <RequestTimelinePanel
                            rangeStart={request.startDate}
                            rangeEnd={request.endDate}
                            onRangeChange={(s, e) =>
                                setRequest((f) => ({ ...f, startDate: s, endDate: e }))
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// AOI 사전 점검 패널 (P0) — 품질 진단 + 방법 추천
// ────────────────────────────────────────────────────────────────────────────

function AoiAssessPanel({
    form,
    onApplyMethod,
}: {
    form: RequestForm;
    onApplyMethod: (t: AnalysisType) => void;
}) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AoiAssessment | null>(null);
    const timerRef = useRef<number | null>(null);

    const aoiKey = `${form.nwLat}|${form.nwLon}|${form.seLat}|${form.seLon}`;
    const prevKeyRef = useRef(aoiKey);
    // AOI 가 바뀌면 이전 진단은 더 이상 유효하지 않으므로 비운다.
    useEffect(() => {
        if (prevKeyRef.current !== aoiKey) {
            prevKeyRef.current = aoiKey;
            setResult(null);
            setLoading(false);
            if (timerRef.current) window.clearTimeout(timerRef.current);
        }
    }, [aoiKey]);
    useEffect(
        () => () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        },
        [],
    );

    const aoiValid = parseAoiFromForm(form) !== null;

    const run = () => {
        const ring = parseAoiFromForm(form);
        if (!ring) return;
        setResult(null);
        setLoading(true);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        // 가벼운 사전검증 호출(POST /aoi/assess) 시뮬레이션.
        timerRef.current = window.setTimeout(() => {
            setResult(assessAoi(ring));
            setLoading(false);
        }, 600);
    };

    return (
        <div className="col gap-2">
            <button
                type="button"
                className="btn btn--sm"
                onClick={run}
                disabled={!aoiValid || loading}
                style={{ width: '100%', justifyContent: 'center' }}
            >
                {loading ? (
                    <>
                        <span
                            aria-hidden
                            style={{
                                display: 'inline-block',
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                border: '2px solid currentColor',
                                borderTopColor: 'transparent',
                                animation: 'spin 0.8s linear infinite',
                                marginRight: 6,
                                verticalAlign: '-2px',
                            }}
                        />
                        진단 중…
                    </>
                ) : (
                    <>
                        <Icon name="shield" size={13} /> AOI 사전 점검 {result ? '다시 실행' : '실행'}
                    </>
                )}
            </button>
            {!aoiValid ? (
                <span className="faint" style={{ fontSize: 11 }}>
                    유효한 AOI 를 먼저 지정하세요.
                </span>
            ) : null}
            {result ? (
                <AssessResult
                    result={result}
                    onApplyMethod={(t) => {
                        onApplyMethod(t);
                        toast(`추천 방법 ${t} 을(를) 적용했습니다`, { tone: 'success' });
                    }}
                />
            ) : null}
        </div>
    );
}

function AssessResult({
    result,
    onApplyMethod,
}: {
    result: AoiAssessment;
    onApplyMethod: (t: AnalysisType) => void;
}) {
    const q = QUALITY_META[result.quality];
    const pct = (v: number) => Math.round(v * 100);
    const covers: LandcoverKey[] = ['urban', 'forest', 'farmland', 'water'];

    return (
        <div className="col gap-3" style={{ marginTop: 4 }}>
            {/* 품질 요약 */}
            <div
                style={{
                    padding: '8px 10px',
                    border: `1px solid ${q.color}`,
                    borderRadius: 6,
                    background: 'var(--bg-2)',
                }}
            >
                <div className="between" style={{ alignItems: 'center' }}>
                    <span className="row gap-2" style={{ alignItems: 'baseline' }}>
                        <span className="faint" style={{ fontSize: 11 }}>
                            품질
                        </span>
                        <span style={{ fontWeight: 700, color: q.color, fontSize: 13 }}>{q.label}</span>
                    </span>
                    <span className="row gap-2" style={{ alignItems: 'baseline', fontSize: 11 }}>
                        <span className="faint">평균 coherence</span>
                        <span className="mono tabular" style={{ fontWeight: 600 }}>
                            {result.coherenceMean.toFixed(2)}
                        </span>
                    </span>
                </div>
                <div className="faint" style={{ fontSize: 10.5, marginTop: 4 }}>
                    면적 ~{result.areaKm2}km² · 평균 경사 {result.slope.meanDeg}° · 급경사{' '}
                    {pct(result.slope.steepFrac)}%
                </div>
            </div>

            {/* 토지피복 막대 + 범례 */}
            <div className="col gap-1">
                <span className="faint" style={{ fontSize: 11 }}>
                    토지피복
                </span>
                <div
                    style={{
                        display: 'flex',
                        height: 8,
                        borderRadius: 4,
                        overflow: 'hidden',
                        background: 'var(--bg-3)',
                    }}
                >
                    {covers.map((k) =>
                        result.landcover[k] > 0.005 ? (
                            <div
                                key={k}
                                style={{
                                    width: `${result.landcover[k] * 100}%`,
                                    background: LANDCOVER_META[k].color,
                                }}
                                title={`${LANDCOVER_META[k].label} ${pct(result.landcover[k])}%`}
                            />
                        ) : null,
                    )}
                </div>
                <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                    {covers.map((k) => (
                        <span
                            key={k}
                            className="row"
                            style={{ gap: 4, alignItems: 'center', fontSize: 10.5 }}
                        >
                            <span
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 2,
                                    background: LANDCOVER_META[k].color,
                                    flexShrink: 0,
                                }}
                            />
                            <span className="faint">{LANDCOVER_META[k].label}</span>
                            <span className="mono tabular">{pct(result.landcover[k])}%</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* 경고 */}
            {result.warnings.length ? (
                <div className="col gap-1">
                    {result.warnings.map((w, i) => (
                        <div
                            key={i}
                            className="row gap-2"
                            style={{
                                alignItems: 'flex-start',
                                fontSize: 10.5,
                                lineHeight: 1.45,
                                color: 'var(--text-secondary)',
                            }}
                        >
                            <Icon
                                name="info"
                                size={11}
                                style={{ color: 'var(--warning)', marginTop: 1, flexShrink: 0 }}
                            />
                            <span>{w}</span>
                        </div>
                    ))}
                </div>
            ) : null}

            {/* 방법 추천 */}
            <div
                className="col gap-2"
                style={{
                    padding: '8px 10px',
                    border: '1px solid var(--accent-border)',
                    borderRadius: 6,
                    background: 'var(--accent-soft)',
                }}
            >
                <div className="between" style={{ alignItems: 'center' }}>
                    <span className="row gap-2" style={{ alignItems: 'center' }}>
                        <span className="faint" style={{ fontSize: 11 }}>
                            추천 방법
                        </span>
                        <span className={`badge ${typeBadge(result.primaryMethod)}`} style={{ fontSize: 10 }}>
                            {result.primaryMethod}
                        </span>
                    </span>
                    <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => onApplyMethod(result.primaryMethod)}
                    >
                        이 방법 적용
                    </button>
                </div>
                <span className="faint" style={{ fontSize: 10.5, lineHeight: 1.45 }}>
                    {result.primaryRationale}
                </span>
            </div>

            {/* 토지피복별 권장 방법 */}
            <div className="col gap-1">
                <span className="faint" style={{ fontSize: 11 }}>
                    영역별 권장
                </span>
                {result.segments.map((s) => {
                    const eq = QUALITY_META[s.estQuality];
                    return (
                        <div
                            key={s.cover}
                            className="between"
                            style={{ fontSize: 10.5, padding: '3px 0', alignItems: 'center', gap: 8 }}
                        >
                            <span className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 2,
                                        background: LANDCOVER_META[s.cover].color,
                                        flexShrink: 0,
                                    }}
                                />
                                <span style={{ fontWeight: 600 }}>{s.region}</span>
                                <span className="faint mono tabular">{pct(s.fraction)}%</span>
                            </span>
                            <span
                                className="row gap-2"
                                style={{ alignItems: 'center', textAlign: 'right', flexShrink: 0 }}
                            >
                                <span style={{ color: 'var(--text-secondary)' }}>{s.methodLabel}</span>
                                <span style={{ color: eq.color, fontWeight: 600 }}>{eq.label}</span>
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* 통째 처리 + masking 안내 */}
            <span className="faint" style={{ fontSize: 10, lineHeight: 1.4 }}>
                {result.maskNote}
            </span>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 분석 요청 — 사이드바 (폼 + scene 선택)
// ────────────────────────────────────────────────────────────────────────────

interface RequestSidebarProps {
    form: RequestForm;
    onChangeField: <K extends keyof RequestForm>(key: K, value: RequestForm[K]) => void;
    onChangeType: (t: AnalysisType) => void;
    onToggleLayer: (k: string) => void;
    selectedCount: number;
    availableCount: number;
    submitting: boolean;
    onSubmit: () => void;
    onReset: () => void;
    dinsarOverlap: number | null;
    /** 저장된 AOI 메뉴에서 호버 중인 항목 — 부모가 지도에 미리보기 표시용으로 사용. */
    onAoiHover: (aoi: SavedAoi | null) => void;
    /** 저장된 AOI 가 폼에 적용된 직후 호출 — 부모가 fitKey 를 bump 해 줌인. */
    onAoiApplied: (aoi: SavedAoi) => void;
    // scene picker
    scenes: AvailableScene[];
    selectedSceneIds: Set<string>;
    onToggleScene: (id: string) => void;
    onSelectAllScenes: () => void;
    onClearScenes: () => void;
    hoveredSceneId: string | null;
    onHoverScene: (id: string | null) => void;
}

function RequestSidebar({
    form,
    onChangeField,
    onChangeType,
    onToggleLayer,
    selectedCount,
    availableCount,
    submitting,
    onSubmit,
    onReset,
    dinsarOverlap,
    onAoiHover,
    onAoiApplied,
    scenes,
    selectedSceneIds,
    onToggleScene,
    onSelectAllScenes,
    onClearScenes,
    hoveredSceneId,
    onHoverScene,
}: RequestSidebarProps) {
    const minSel = ANALYSIS_META[form.type].minScenes;
    const ready = selectedCount >= minSel;
    const [sidebarTab, setSidebarTab] = useState<'options' | 'scenes'>('options');
    return (
        <>
            {/* 상단 탭 — 검색 옵션 ↔ scene 선택 */}
            <div
                role="tablist"
                aria-label="요청 사이드바 탭"
                style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-1)',
                    flexShrink: 0,
                    padding: '0 8px',
                    gap: 2,
                }}
            >
                {(
                    [
                        ['options', '검색 옵션'],
                        ['scenes', 'scene 선택'],
                    ] as const
                ).map(([k, label]) => {
                    const active = sidebarTab === k;
                    return (
                        <button
                            key={k}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setSidebarTab(k)}
                            style={{
                                flex: 1,
                                padding: '10px 8px',
                                background: 'none',
                                border: 0,
                                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                                fontWeight: active ? 600 : 500,
                                fontSize: 12.5,
                                cursor: 'pointer',
                                marginBottom: -1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <span>{label}</span>
                            {k === 'scenes' ? (
                                <span
                                    className="mono tabular"
                                    style={{
                                        fontSize: 10.5,
                                        padding: '1px 6px',
                                        borderRadius: 8,
                                        background: ready
                                            ? 'color-mix(in srgb, var(--success) 18%, transparent)'
                                            : 'var(--bg-3)',
                                        color: ready ? 'var(--success)' : 'var(--text-secondary)',
                                        fontWeight: 600,
                                    }}
                                >
                                    {selectedCount}/{minSel}
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </div>

            {/* 검색 옵션 탭 — 폼 */}
            <div
                role="tabpanel"
                aria-hidden={sidebarTab !== 'options'}
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                    display: sidebarTab === 'options' ? 'block' : 'none',
                }}
            >
                <Section title="분석 유형">
                    <div className="col gap-2">
                        {(Object.keys(ANALYSIS_META) as AnalysisType[]).map((t) => {
                            const meta = ANALYSIS_META[t];
                            const active = form.type === t;
                            return (
                                <div
                                    key={t}
                                    onClick={() => onChangeType(t)}
                                    style={{
                                        padding: '10px 12px',
                                        border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-default)'}`,
                                        borderRadius: 6,
                                        background: active ? 'var(--accent-soft)' : 'var(--bg-2)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                                        <span
                                            style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: '50%',
                                                border: `3px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                                                background: active ? '#fff' : 'transparent',
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span style={{ fontWeight: 600, fontSize: 12.5 }}>
                                            {meta.label}
                                        </span>
                                        <span className={`badge ${typeBadge(t)}`} style={{ fontSize: 10 }}>
                                            {t}
                                        </span>
                                    </div>
                                    <div className="faint" style={{ fontSize: 11, lineHeight: 1.4, marginTop: 4 }}>
                                        {meta.sub}
                                    </div>
                                    <div
                                        style={{
                                            marginTop: 6,
                                            fontSize: 10.5,
                                            color: active ? 'var(--accent)' : 'var(--text-tertiary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                        }}
                                    >
                                        <Icon name="square" size={9} style={{ opacity: 0.7 }} />
                                        필요 {meta.sceneRequirement}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Section>

                <Section title="분석 이름">
                    <input
                        className="input"
                        value={form.name}
                        placeholder="예: Pohang subsidence 2026Q1"
                        onChange={(e) => onChangeField('name', e.target.value)}
                        style={{ width: '100%' }}
                    />
                </Section>

                <Section title="AOI (관심 영역)" hint="WGS84 위경도. 지도에서 그리거나 라이브러리에서 불러올 수 있습니다.">
                    <div className="col gap-2">
                        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                            <SaveAoiButton
                                bounds={(() => {
                                    const nlat = parseFloat(form.nwLat);
                                    const nlon = parseFloat(form.nwLon);
                                    const slat = parseFloat(form.seLat);
                                    const slon = parseFloat(form.seLon);
                                    if (![nlat, nlon, slat, slon].every(Number.isFinite)) return null;
                                    if (nlat <= slat || slon <= nlon) return null;
                                    return { nwLat: nlat, nwLon: nlon, seLat: slat, seLon: slon };
                                })()}
                            />
                            <LoadAoiMenu
                                onHover={onAoiHover}
                                onApply={(a) => {
                                    onChangeField('nwLat', a.nwLat.toFixed(4));
                                    onChangeField('nwLon', a.nwLon.toFixed(4));
                                    onChangeField('seLat', a.seLat.toFixed(4));
                                    onChangeField('seLon', a.seLon.toFixed(4));
                                    onAoiApplied(a);
                                }}
                            />
                        </div>
                        <div className="row gap-2">
                            <LabeledInput
                                label="NW lat"
                                value={form.nwLat}
                                onChange={(v) => onChangeField('nwLat', v)}
                            />
                            <LabeledInput
                                label="NW lon"
                                value={form.nwLon}
                                onChange={(v) => onChangeField('nwLon', v)}
                            />
                        </div>
                        <div className="row gap-2">
                            <LabeledInput
                                label="SE lat"
                                value={form.seLat}
                                onChange={(v) => onChangeField('seLat', v)}
                            />
                            <LabeledInput
                                label="SE lon"
                                value={form.seLon}
                                onChange={(v) => onChangeField('seLon', v)}
                            />
                        </div>
                    </div>
                </Section>

                <Section
                    title="AOI 사전 점검"
                    hint="무거운 처리 전에 coherence·토지피복·경사를 진단하고 방법을 추천합니다."
                >
                    <AoiAssessPanel form={form} onApplyMethod={onChangeType} />
                </Section>

                <Section title="기간">
                    <DateRangePicker
                        start={form.startDate}
                        end={form.endDate}
                        maxDate={new Date()}
                        onChange={(s, e) => {
                            onChangeField('startDate', s);
                            onChangeField('endDate', e);
                        }}
                    />
                </Section>

                <Section title="미션">
                    <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                        <span
                            className={`chip${form.s1a ? ' chip--active' : ''}`}
                            onClick={() => onChangeField('s1a', !form.s1a)}
                        >
                            Sentinel-1A
                        </span>
                        <span
                            className={`chip${form.s1c ? ' chip--active' : ''}`}
                            onClick={() => onChangeField('s1c', !form.s1c)}
                        >
                            Sentinel-1C
                        </span>
                    </div>
                </Section>

                <Section title="편광">
                    <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                        {['VV', 'VH', 'HH', 'HV', 'VV+VH'].map((p) => (
                            <span
                                key={p}
                                className={`chip${form.polarization === p ? ' chip--active' : ''}`}
                                onClick={() => onChangeField('polarization', p)}
                            >
                                {p}
                            </span>
                        ))}
                    </div>
                </Section>

                {form.type === 'DInSAR' ? (
                    <Section title="DInSAR 파라미터">
                        <div className="col gap-3">
                            <NumberField
                                label="최소 코히어런스"
                                value={form.coherenceMin}
                                step={0.05}
                                min={0}
                                max={1}
                                onChange={(v) => onChangeField('coherenceMin', v)}
                                hint="0–1, 0.5 권장"
                                info="픽셀별 위상 신뢰도(0~1). 이 값 미만의 픽셀은 결과에서 마스킹됩니다. 너무 높이면 분석 면적이 좁아지고, 너무 낮추면 노이즈가 결과에 섞입니다."
                            />
                            <div className="faint" style={{ fontSize: 11, lineHeight: 1.5 }}>
                                Master/Slave 쌍은 아래 scene 선택에서 두 scene 을 선택하세요.
                            </div>
                        </div>
                    </Section>
                ) : null}

                {form.type === 'PSInSAR' ? (
                    <Section title="PSInSAR 파라미터">
                        <div className="col gap-3">
                            <NumberField
                                label="최소 scene 수"
                                value={form.minScenes}
                                step={1}
                                min={5}
                                onChange={(v) => onChangeField('minScenes', v)}
                                hint="20개 이상 권장"
                                info="시계열 분석에 사용할 최소 scene 장수. 적으면 PS 후보가 부족해 통계적으로 신뢰가 떨어집니다."
                            />
                            <NumberField
                                label="PS 코히어런스 임계값"
                                value={form.coherenceMin}
                                step={0.05}
                                min={0}
                                max={1}
                                onChange={(v) => onChangeField('coherenceMin', v)}
                                hint="0.7 권장"
                                info="PS 후보 식별에 쓰이는 진폭 분산 / 시간 코히어런스 임계값. 보통 0.7 이상을 사용해 안정한 점만 남깁니다."
                            />
                            <div className="row gap-2">
                                <LabeledInput
                                    label="reference lat"
                                    value={form.referenceLat}
                                    onChange={(v) => onChangeField('referenceLat', v)}
                                />
                                <LabeledInput
                                    label="reference lon"
                                    value={form.referenceLon}
                                    onChange={(v) => onChangeField('referenceLon', v)}
                                />
                            </div>
                            <div className="faint" style={{ fontSize: 11, lineHeight: 1.5 }}>
                                Reference point 는 변위 0 으로 가정하는 안정 지반 좌표입니다.
                            </div>
                        </div>
                    </Section>
                ) : null}

                {form.type === 'SBAS' ? (
                    <Section title="SBAS 파라미터">
                        <div className="col gap-3">
                            <NumberField
                                label="최대 시간 베이스라인 (일)"
                                value={form.temporalBaselineMaxDays}
                                step={6}
                                min={6}
                                onChange={(v) => onChangeField('temporalBaselineMaxDays', v)}
                                hint="60일 권장"
                                info="interferogram 페어 두 scene 간 허용 최대 시간 차이. 길수록 페어 수는 늘지만 시간적 디코히어런스(식생 변화 등)가 증가합니다."
                            />
                            <NumberField
                                label="최대 공간 베이스라인 (m)"
                                value={form.spatialBaselineMaxM}
                                step={50}
                                min={50}
                                onChange={(v) => onChangeField('spatialBaselineMaxM', v)}
                                hint="200m 권장"
                                info="두 acquisition 의 위성 궤도 간 허용 최대 수직 거리(perpendicular baseline). 클수록 페어 수는 늘지만 기하학적 디코히어런스가 증가합니다."
                            />
                            <NumberField
                                label="최소 코히어런스"
                                value={form.coherenceMin}
                                step={0.05}
                                min={0}
                                max={1}
                                onChange={(v) => onChangeField('coherenceMin', v)}
                                hint="0.3 권장"
                                info="interferogram 픽셀 마스킹 임계값. SBAS 는 분산형 산란체도 보존하므로 PSInSAR 보다 낮은 값을 사용합니다."
                            />
                        </div>
                    </Section>
                ) : null}

                <Section title="산출 레이어">
                    <div className="col gap-2">
                        {(
                            [
                                [
                                    'mean_velocity',
                                    'mean_velocity',
                                    'mm/yr',
                                    '분석 기간 동안의 평균 LOS 변위 속도. 양수=위성 방향으로 접근, 음수=멀어짐. 가장 일반적으로 쓰이는 산출물.',
                                ],
                                [
                                    'coherence',
                                    'coherence',
                                    '0–1',
                                    'interferogram 페어 / PS 의 평균 코히어런스 맵 (0~1). 분석 결과의 신뢰도/유효 영역을 판단하는 데 사용.',
                                ],
                                [
                                    'cumulative_disp',
                                    'cumulative_disp',
                                    'mm',
                                    '기준 epoch 부터의 누적 LOS 변위. 시계열로 변위 진행을 보여주며, 산사태/지반 침하 추적에 사용.',
                                ],
                                [
                                    'wrapped_phase',
                                    'wrapped_phase',
                                    'rad',
                                    '위상 차이를 -π~π 로 wrap 한 raw 결과. fringe 패턴 시각화 / unwrap 전 진단용.',
                                ],
                            ] as const
                        ).map(([k, label, unit, desc]) => {
                            const on = form.layers.has(k);
                            return (
                                <label
                                    key={k}
                                    className="row gap-2"
                                    style={{ cursor: 'pointer', alignItems: 'center' }}
                                >
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={on}
                                        onChange={() => onToggleLayer(k)}
                                    />
                                    <span className="mono" style={{ fontSize: 12, fontWeight: on ? 600 : 400 }}>
                                        {label}
                                    </span>
                                    <span
                                        className="faint"
                                        style={{ fontSize: 11, marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                    >
                                        {unit}
                                        <InfoTip text={desc} size={11} placement="left" />
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </Section>

            </div>

            {/* scene 선택 탭 — 폼과 같은 위치에 배치되며 탭으로 토글된다.
                display:none 으로 숨겨도 내부 상태(스크롤, 호버)는 그대로 유지된다. */}
            <div
                role="tabpanel"
                aria-hidden={sidebarTab !== 'scenes'}
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: sidebarTab === 'scenes' ? 'flex' : 'none',
                    flexDirection: 'column',
                }}
            >
                <ScenePickerInline
                    scenes={scenes}
                    selected={selectedSceneIds}
                    onToggle={onToggleScene}
                    onSelectAll={onSelectAllScenes}
                    onClear={onClearScenes}
                    analysisType={form.type}
                    hoveredId={hoveredSceneId}
                    onHover={onHoverScene}
                />
            </div>

            {/* 제출 footer */}
            <div
                style={{
                    flexShrink: 0,
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-1)',
                    padding: 12,
                }}
            >
                <div
                    className="between"
                    style={{ marginBottom: 8, fontSize: 11.5 }}
                >
                    <span className="faint">
                        scene 선택{' '}
                        <span
                            className="mono tabular"
                            style={{ color: ready ? 'var(--success)' : 'var(--text-secondary)' }}
                        >
                            {selectedCount}/{minSel}
                        </span>
                    </span>
                    <span className="faint mono tabular">사용 가능 {availableCount}</span>
                </div>
                {dinsarOverlap !== null ? (
                    (() => {
                        const pct = Math.round(dinsarOverlap);
                        const tone =
                            pct >= 80
                                ? { color: 'var(--success)', label: '안정' }
                                : pct >= 70
                                  ? { color: 'var(--warning)', label: '권장 하한' }
                                  : { color: 'var(--danger)', label: '낮음' };
                        return (
                            <div
                                className="between"
                                style={{
                                    marginBottom: 8,
                                    padding: '6px 8px',
                                    fontSize: 11.5,
                                    background: 'var(--bg-2)',
                                    border: `1px solid ${tone.color}`,
                                    borderRadius: 4,
                                    alignItems: 'center',
                                }}
                            >
                                <span className="row gap-2" style={{ alignItems: 'center' }}>
                                    <span className="faint">master/slave 겹침</span>
                                    <span
                                        className="mono tabular"
                                        style={{ color: tone.color, fontWeight: 600 }}
                                    >
                                        {pct}%
                                    </span>
                                    <span style={{ color: tone.color, fontSize: 10.5 }}>
                                        · {tone.label}
                                    </span>
                                </span>
                                <InfoTip text="DInSAR 권장 겹침: ≥80% 안정 / 70~80% 권장 하한 / <70% 분석 가용 면적이 좁음. 정보용이며 제출은 가능합니다." />
                            </div>
                        );
                    })()
                ) : null}
                <div className="row gap-2">
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={onReset}
                        disabled={submitting}
                    >
                        <Icon name="refresh" size={12} />
                    </button>
                    <button
                        type="button"
                        className="btn btn--primary"
                        style={{ flex: 1 }}
                        onClick={onSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <span
                                    aria-hidden
                                    style={{
                                        display: 'inline-block',
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        border: '2px solid currentColor',
                                        borderTopColor: 'transparent',
                                        animation: 'spin 0.8s linear infinite',
                                        marginRight: 6,
                                        verticalAlign: '-2px',
                                    }}
                                />
                                요청 접수 중…
                            </>
                        ) : (
                            <>
                                <Icon name="plus" size={13} /> 분석 요청
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 분석 요청 — scene 선택 (좌측 사이드바 내부)
// ────────────────────────────────────────────────────────────────────────────

interface ScenePickerInlineProps {
    scenes: AvailableScene[];
    selected: Set<string>;
    onToggle: (id: string) => void;
    onSelectAll: () => void;
    onClear: () => void;
    analysisType: AnalysisType;
    hoveredId: string | null;
    onHover: (id: string | null) => void;
}

function ScenePickerInline({
    scenes,
    selected,
    onToggle,
    onSelectAll,
    onClear,
    analysisType,
    hoveredId,
    onHover,
}: ScenePickerInlineProps) {
    const minScenes = ANALYSIS_META[analysisType].minScenes;
    const ready = selected.size >= minScenes;
    const allSelected =
        analysisType === 'DInSAR'
            ? selected.size === 2 && scenes.length >= 2
            : scenes.length > 0 && selected.size >= scenes.length;

    // 선택된 scene 들의 baseline 통계.
    const baselineSummary = useMemo(() => {
        if (selected.size < 2) return null;
        const picks = scenes.filter((s) => selected.has(s.id));
        if (picks.length < 2) return null;
        const perps = picks.map((s) => s.perpBaseline);
        if (analysisType === 'DInSAR' && picks.length === 2) {
            const a = perps[0]!;
            const b = perps[1]!;
            const pair = Math.abs(a - b);
            const quality = pair < 150 ? 'good' : pair < 250 ? 'marginal' : 'poor';
            return { mode: 'pair' as const, pair, quality };
        }
        const abs = perps.map((p) => Math.abs(p));
        const min = Math.min(...abs);
        const max = Math.max(...abs);
        const mean = Math.round(abs.reduce((s, v) => s + v, 0) / abs.length);
        return { mode: 'stack' as const, min, max, mean };
    }, [selected, scenes, analysisType]);

    return (
        <div
            style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-1)',
            }}
        >
            <div
                style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    flexShrink: 0,
                }}
            >
                <div className="row gap-2 between" style={{ alignItems: 'center' }}>
                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <span
                            className={`badge ${typeBadge(analysisType)}`}
                            style={{ fontSize: 10 }}
                        >
                            {analysisType}
                        </span>
                        <span className="faint" style={{ fontSize: 11 }}>
                            {scenes.length}개 가용
                        </span>
                    </div>
                    <span
                        className="badge"
                        style={{
                            background: ready
                                ? 'color-mix(in srgb, var(--success) 18%, transparent)'
                                : 'var(--bg-3)',
                            color: ready ? 'var(--success)' : 'var(--text-secondary)',
                            fontSize: 10.5,
                        }}
                    >
                        {selected.size}/{minScenes}
                    </span>
                </div>
                {analysisType === 'DInSAR' ? (
                    <div
                        className="faint"
                        style={{ fontSize: 10.5, marginTop: 4, lineHeight: 1.4 }}
                    >
                        두 scene 선택 시 master/slave 자동 매칭
                    </div>
                ) : null}

                {baselineSummary ? (
                    <div
                        className="mono tabular"
                        style={{
                            marginTop: 6,
                            padding: '5px 7px',
                            background: 'var(--bg-2)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 4,
                            fontSize: 10.5,
                            color: 'var(--text-secondary)',
                        }}
                    >
                        {baselineSummary.mode === 'pair' ? (
                            <>
                                <span style={{ color: 'var(--text-tertiary)' }}>페어 B⊥</span>{' '}
                                <span
                                    style={{
                                        fontWeight: 700,
                                        color:
                                            baselineSummary.quality === 'good'
                                                ? 'var(--success)'
                                                : baselineSummary.quality === 'marginal'
                                                  ? 'var(--warning)'
                                                  : 'var(--danger)',
                                    }}
                                >
                                    {baselineSummary.pair} m
                                </span>{' '}
                                <span style={{ color: 'var(--text-tertiary)' }}>
                                    ·{' '}
                                    {baselineSummary.quality === 'good'
                                        ? 'coherence 양호'
                                        : baselineSummary.quality === 'marginal'
                                          ? 'coherence 경계'
                                          : 'coherence 위험'}
                                </span>
                            </>
                        ) : (
                            <>
                                <span style={{ color: 'var(--text-tertiary)' }}>스택 |B⊥|</span>{' '}
                                min {baselineSummary.min} · mean {baselineSummary.mean} · max{' '}
                                {baselineSummary.max} m
                            </>
                        )}
                    </div>
                ) : null}
            </div>

            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                {scenes.length === 0 ? (
                    <div className="empty" style={{ padding: 20, fontSize: 11.5 }}>
                        가용 scene 이 없습니다 — AOI · 기간 · 미션을 확인하세요
                    </div>
                ) : (
                    scenes.map((s) => {
                        const isSel = selected.has(s.id);
                        const isHov = hoveredId === s.id;
                        const order = isSel ? Array.from(selected).indexOf(s.id) + 1 : null;
                        const missionColor = s.mission === 'S1A' ? '#22d3ee' : '#a855f7';
                        return (
                            <div
                                key={s.id}
                                onClick={() => onToggle(s.id)}
                                onMouseEnter={() => onHover(s.id)}
                                onMouseLeave={() => onHover(null)}
                                style={{
                                    padding: '8px 10px',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    background: isSel
                                        ? 'var(--accent-soft)'
                                        : isHov
                                          ? 'var(--bg-2)'
                                          : undefined,
                                    borderLeft: isSel
                                        ? '3px solid var(--accent)'
                                        : '3px solid transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={isSel}
                                    onChange={() => onToggle(s.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ flexShrink: 0 }}
                                />
                                {/* SLC 는 미리보기 미지원 — 썸네일 대신 선택 순서 칩만 보여주고
                                    실제 풋프린트는 지도에서 확인. */}
                                {order ? (
                                    <span
                                        title={`선택 순서: ${order}`}
                                        style={{
                                            flexShrink: 0,
                                            width: 22,
                                            height: 22,
                                            borderRadius: '50%',
                                            background: 'var(--accent)',
                                            color: '#fff',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontFamily: 'var(--font-mono)',
                                        }}
                                    >
                                        {order}
                                    </span>
                                ) : null}
                                <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                                        <span
                                            style={{
                                                fontSize: 9.5,
                                                padding: '0 5px',
                                                height: 14,
                                                lineHeight: '13px',
                                                borderRadius: 3,
                                                background: missionColor + '22',
                                                color: missionColor,
                                                border: `1px solid ${missionColor}55`,
                                                fontFamily: 'var(--font-mono)',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {s.mission}
                                        </span>
                                        <span className="faint mono tabular" style={{ fontSize: 10 }}>
                                            {s.pass}
                                        </span>
                                        <span
                                            className="mono tabular"
                                            style={{ fontSize: 10, color: 'var(--text-secondary)' }}
                                        >
                                            {s.date}
                                        </span>
                                        <span
                                            className="faint mono tabular"
                                            title="perpendicular baseline — 작을수록 coherence 양호"
                                            style={{ fontSize: 10, marginLeft: 'auto' }}
                                        >
                                            ⊥{s.perpBaseline >= 0 ? '+' : ''}
                                            {s.perpBaseline}m
                                        </span>
                                    </div>
                                    <div
                                        className="mono"
                                        title={s.id}
                                        style={{
                                            fontSize: 10.5,
                                            fontWeight: isSel ? 600 : 500,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        {s.id}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div
                style={{
                    padding: 8,
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-2)',
                    flexShrink: 0,
                    display: 'flex',
                    gap: 6,
                }}
            >
                <button
                    type="button"
                    className="btn btn--sm"
                    style={{ flex: 1 }}
                    onClick={onSelectAll}
                    disabled={scenes.length === 0 || allSelected}
                >
                    <Icon name="plus" size={11} />{' '}
                    {analysisType === 'DInSAR' ? '첫/마지막 페어' : `전체 (${scenes.length})`}
                </button>
                <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={onClear}
                    disabled={selected.size === 0}
                    style={{ flex: '0 0 auto' }}
                >
                    해제
                </button>
            </div>
        </div>
    );
}

