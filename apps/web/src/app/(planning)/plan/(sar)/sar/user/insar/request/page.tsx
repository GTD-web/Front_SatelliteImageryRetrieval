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

import { LabeledInput, Section, typeBadge } from '../_shared';

// ────────────────────────────────────────────────────────────────────────────
// 분석 요청 (request) 모델
// ────────────────────────────────────────────────────────────────────────────

type AnalysisType = 'DInSAR' | 'PSInSAR' | 'SBAS';

/** 폼 검증 실패 시 어느 입력이 문제인지 + 메시지. 토스트와 인라인 표시에 공용. */
type FieldErrorKey = 'name' | 'aoi' | 'mission' | 'reference' | 'scenes';
interface FieldError {
    field: FieldErrorKey;
    message: string;
}

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

/**
 * 분석 유형별 자동 처리 파라미터.
 * 사용자는 이 값을 직접 만지지 않는다 — 유형만 고르면 권장값이 자동 적용되고
 * "자동 설정값" 패널에 읽기 전용으로 노출된다. 실제 정밀 튜닝은 백엔드 처리 시 수행.
 */
const AUTO_PARAMS: Record<
    AnalysisType,
    {
        polarization: string;
        coherenceMin: number;
        temporalBaselineMaxDays: number;
        spatialBaselineMaxM: number;
        minScenes: number;
    }
> = {
    DInSAR: {
        polarization: 'VV+VH',
        coherenceMin: 0.5,
        temporalBaselineMaxDays: 24,
        spatialBaselineMaxM: 150,
        minScenes: 2,
    },
    PSInSAR: {
        polarization: 'VV',
        coherenceMin: 0.7,
        temporalBaselineMaxDays: 36,
        spatialBaselineMaxM: 200,
        minScenes: 20,
    },
    SBAS: {
        polarization: 'VV+VH',
        coherenceMin: 0.3,
        temporalBaselineMaxDays: 60,
        spatialBaselineMaxM: 200,
        minScenes: 15,
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
    coherenceMin: number;
    temporalBaselineMaxDays: number;
    spatialBaselineMaxM: number;
    minScenes: number;
    /** PSInSAR reference point 선택 방식 — 자동(가장 안정한 PS) vs 직접 좌표 입력. */
    referenceMode: 'auto' | 'manual';
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
        ...AUTO_PARAMS.DInSAR,
        referenceMode: 'auto',
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

/**
 * SBAS/PSInSAR opt-out 모델의 "불량일" 판정 임계 (기준 대비 |B⊥|, m).
 * 넘으면 기하 디코릴레이션 위험이 커 자동 제외 후보로 본다.
 */
const PERP_WARN_M = 150;

/** 기준(super-master) scene 대비 perpendicular baseline (m). 기준 자신은 0. */
function relPerpBaseline(s: AvailableScene, refPerp: number): number {
    return s.perpBaseline - refPerp;
}

/** 기준 대비 |B⊥| 가 임계를 넘으면 불량일(기하 디코릴레이션 위험). */
function isLowQualityScene(s: AvailableScene, refPerp: number): boolean {
    return Math.abs(relPerpBaseline(s, refPerp)) > PERP_WARN_M;
}

/**
 * 스택의 기준(super-master) scene id — 기준 대비 |B⊥| 분산을 최소화하도록 perpBaseline 중앙값 scene 선택.
 * 실제 백엔드(GET /api/v1/baseline)에서는 정밀궤도 기반으로 기준·상대 B⊥ 를 계산해 내려준다.
 */
function pickReferenceSceneId(scenes: AvailableScene[]): string | null {
    if (scenes.length === 0) return null;
    const sorted = [...scenes].sort((a, b) => a.perpBaseline - b.perpBaseline);
    return sorted[Math.floor(sorted.length / 2)]!.id;
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
    const [fieldError, setFieldError] = useState<FieldError | null>(null);
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

    // SBAS/PSInSAR 은 opt-out 모델 — 범위가 곧 스택이다. 가용 scene 이 바뀌면 기본값으로
    // "전체 포함" 한다. DInSAR 은 사용자가 2장을 직접 고르므로 건드리지 않는다.
    useEffect(() => {
        if (request.type === 'DInSAR') return;
        setSelectedSceneIds(new Set(availableScenes.map((s) => s.id)));
    }, [request.type, availableScenes]);

    // 스택(SBAS/PSInSAR)의 기준 scene — 각 scene 의 B⊥ 는 이 기준 대비로 계산/표시한다.
    // (DInSAR 은 페어의 master 가 곧 기준이라 스택 기준이 없다.)
    const referenceSceneId = useMemo(
        () => (request.type === 'DInSAR' ? null : pickReferenceSceneId(availableScenes)),
        [request.type, availableScenes],
    );

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

    // SBAS/PSInSAR opt-out — 기준 대비 |B⊥| 가 큰 불량일을 스택에서 일괄 제외.
    const autoExcludeLowQuality = () => {
        const refPerp = availableScenes.find((s) => s.id === referenceSceneId)?.perpBaseline ?? 0;
        const keep = availableScenes.filter((s) => !isLowQualityScene(s, refPerp));
        const removed = availableScenes.length - keep.length;
        setSelectedSceneIds(new Set(keep.map((s) => s.id)));
        if (removed > 0) {
            toast(`품질 낮은 ${removed}개 날짜를 제외했습니다`, { tone: 'success' });
        } else {
            toast('제외할 불량일이 없습니다');
        }
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
            // DInSAR 는 선택한 2장의 풋프린트를 모두 그린다. SBAS/PSInSAR 은 스택이 수십~수백 장이라
            // 개별 풋프린트 대신 공통 관측 영역만 표시한다(지도 과밀 방지).
            if (request.type === 'DInSAR') {
                for (const s of selectedScenes) {
                    out.push({
                        id: s.id,
                        coords: s.footprint,
                        kind: 'candidate',
                        onClick: () => toggleSceneSelection(s.id),
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
        // 유형을 바꾸면 해당 유형의 권장 파라미터를 자동 적용한다(사용자 입력 없음).
        setRequest((f) => ({ ...f, type: t, ...AUTO_PARAMS[t], referenceMode: 'auto' }));
        if (t === 'DInSAR') {
            setSelectedSceneIds((prev) => {
                if (prev.size <= 2) return prev;
                const arr = Array.from(prev).slice(0, 2);
                return new Set(arr);
            });
        }
    };
    // 폼(메타) 검증 — scene 선택을 제외한 입력값. "이미지 선택" 단계에서 확인.
    const validateForm = (): FieldError | null => {
        if (!request.name.trim()) return { field: 'name', message: '분석 이름을 입력해주세요' };
        if (!requestAoi)
            return {
                field: 'aoi',
                message: 'AOI 좌표를 확인해주세요 (NW 가 SE 보다 북서쪽이어야 합니다)',
            };
        if (!request.s1a && !request.s1c) return { field: 'mission', message: '미션을 하나 이상 선택해주세요' };
        return null;
    };
    // 폼 검증 후 통과하면 true — "이미지 선택" 클릭 시 scene 탭으로 넘어갈지 결정.
    const proceedToScenes = (): boolean => {
        const e = validateForm();
        setFieldError(e);
        if (e) {
            toast(e.message, { tone: 'warning', title: '입력 확인' });
            return false;
        }
        return true;
    };
    const submitRequest = () => {
        const formErr = validateForm();
        if (formErr) {
            setFieldError(formErr);
            toast(formErr.message, { tone: 'warning', title: '입력 확인' });
            return;
        }
        const minSel = ANALYSIS_META[request.type].minScenes;
        if (selectedSceneIds.size < minSel) {
            const e: FieldError = {
                field: 'scenes',
                message: `${request.type} 는 최소 ${minSel}개 scene 이 필요합니다 (현재 ${selectedSceneIds.size}개)`,
            };
            setFieldError(e);
            toast(e.message, { tone: 'warning', title: '입력 확인' });
            return;
        }
        setFieldError(null);
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
        setFieldError(null);
        toast('요청 폼 초기화됨');
    };
    // 폼/선택이 바뀌면 인라인 에러 해제 — 사용자가 고치기 시작하면 사라지도록.
    useEffect(() => {
        setFieldError(null);
    }, [request, selectedSceneIds]);

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
                        selectedCount={selectedSceneIds.size}
                        availableCount={availableScenes.length}
                        submitting={submitting}
                        onSubmit={submitRequest}
                        onProceedToScenes={proceedToScenes}
                        fieldError={fieldError}
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
                        onAutoExcludeScenes={autoExcludeLowQuality}
                        referenceSceneId={referenceSceneId}
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

function AoiAssessPanel({ form }: { form: RequestForm }) {
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
            {result ? <AssessResult result={result} /> : null}
        </div>
    );
}

function AssessResult({ result }: { result: AoiAssessment }) {
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
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 분석 기간/가용량 경고 — SBAS(시계열 길이), PSInSAR(PS 통계용 acquisition 장수)
// ────────────────────────────────────────────────────────────────────────────

interface RangeWarning {
    tone: 'danger' | 'warning';
    text: string;
}

/** 분석 유형별 기간·scene 수 경고를 생성한다. options 탭의 파라미터 섹션에서 표시. */
function analysisRangeWarnings(form: RequestForm, availableCount: number): RangeWarning[] {
    const day = 24 * 60 * 60 * 1000;
    const spanDays = Math.max(0, (form.endDate.getTime() - form.startDate.getTime()) / day);
    const spanYears = spanDays / 365.25;
    const spanLabel = spanYears >= 1 ? `${spanYears.toFixed(1)}년` : `${Math.round(spanDays / 30)}개월`;
    const out: RangeWarning[] = [];

    if (form.type === 'SBAS') {
        // SBAS velocity 는 시계열 길이에 민감 — 4~5년 이상 권장.
        if (spanYears < 2) {
            out.push({
                tone: 'danger',
                text: `SBAS 는 안정적인 velocity 추정에 보통 4~5년 이상 시계열을 권장합니다. 현재 약 ${spanLabel} — 0~1 mm/yr 미세 신호가 대기·계절 오차에 묻혀 신뢰가 어렵습니다.`,
            });
        } else if (spanYears < 4) {
            out.push({
                tone: 'warning',
                text: `현재 약 ${spanLabel} — 권장 하한(4~5년) 미만입니다. 기간을 늘리면 velocity 신뢰도가 크게 올라갑니다.`,
            });
        }
        if (availableCount > 0 && availableCount < 50) {
            out.push({
                tone: 'warning',
                text: `가용 scene ${availableCount}장 — SBAS 는 촘촘한 interferogram 망을 위해 보통 수십 장 이상이 유리합니다 (5년·12일이면 ~150장).`,
            });
        }
    }

    if (form.type === 'PSInSAR') {
        // PSInSAR 은 점 산란체 통계 — acquisition '장수' 가 핵심. PS 는 장기 베이스라인에 강해
        // 시계열 길이보다 scene 수에 더 민감하다.
        if (availableCount > 0 && availableCount < 20) {
            out.push({
                tone: 'danger',
                text: `가용 scene ${availableCount}장 — PSInSAR 은 PS 후보 식별에 보통 25~30장 이상이 필요합니다. 현재로는 통계가 부족해 신뢰가 낮습니다.`,
            });
        } else if (availableCount > 0 && availableCount < 30) {
            out.push({
                tone: 'warning',
                text: `가용 scene ${availableCount}장 — 동작은 하지만 30장 이상이면 PS 밀도·velocity 정밀도가 좋아집니다.`,
            });
        }
        if (spanYears < 1) {
            out.push({
                tone: 'warning',
                text: `관측 기간 약 ${spanLabel} — PS 는 장기 베이스라인에 강하지만, velocity 정밀도를 위해 최소 1년 이상 시계열을 권장합니다.`,
            });
        }
    }

    return out;
}

/** 분석 유형별 기간/가용량 경고 박스 목록. */
function RangeWarningList({ items }: { items: RangeWarning[] }) {
    if (!items.length) return null;
    return (
        <div className="col gap-2" style={{ marginBottom: 4 }}>
            {items.map((w, i) => {
                const color = w.tone === 'danger' ? 'var(--danger)' : 'var(--warning)';
                return (
                    <div
                        key={i}
                        className="row gap-2"
                        style={{
                            alignItems: 'flex-start',
                            padding: '7px 9px',
                            borderRadius: 6,
                            fontSize: 11,
                            lineHeight: 1.45,
                            background: 'var(--bg-2)',
                            border: `1px solid ${color}`,
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <Icon name="info" size={12} style={{ color, marginTop: 1, flexShrink: 0 }} />
                        <span>{w.text}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 자동 설정값 — 사용자가 직접 만지지 않는 파라미터를 읽기 전용으로 노출
// ────────────────────────────────────────────────────────────────────────────

interface AutoParamRow {
    label: string;
    value: string;
    info?: string;
}

/** 분석 유형별로 자동 적용되는 파라미터를 사용자에게 보여줄 행 목록으로 변환. */
function autoParamRows(type: AnalysisType): AutoParamRow[] {
    const p = AUTO_PARAMS[type];
    if (type === 'DInSAR') {
        return [
            {
                label: '편광',
                value: p.polarization,
                info: '관측에 사용할 편파 조합. Sentinel-1 기본 수신 조합으로 자동 설정됩니다.',
            },
            {
                label: '최소 코히어런스',
                value: p.coherenceMin.toFixed(2),
                info: '픽셀별 위상 신뢰도 임계값(0~1). 이 값 미만 픽셀은 결과에서 마스킹됩니다. DInSAR 은 0.5 를 기본으로 합니다.',
            },
            {
                label: 'Master/Slave',
                value: 'scene 선택에서 2장',
                info: '아래 "scene 선택" 탭에서 두 scene 을 고르면 자동으로 master/slave 페어가 됩니다.',
            },
        ];
    }
    if (type === 'PSInSAR') {
        return [
            {
                label: '편광',
                value: p.polarization,
                info: 'PS 분석은 단일 편파(VV)로 충분하고 안정적입니다.',
            },
            {
                label: 'PS 코히어런스 임계값',
                value: p.coherenceMin.toFixed(2),
                info: 'PS 후보 식별에 쓰이는 시간 코히어런스 임계값. 보통 0.7 이상으로 안정한 점만 남깁니다.',
            },
            {
                label: '최소 scene 수',
                value: `${p.minScenes}장 이상`,
                info: 'PS 통계에 필요한 최소 acquisition 장수. 적으면 PS 후보가 부족해 신뢰가 떨어집니다.',
            },
            {
                label: 'Reference point',
                value: '자동 (가장 안정한 점)',
                info: 'PS 후보 중 시간 coherence 가 가장 높은(가장 안정한) 점을 기준점으로 자동 선택합니다.',
            },
        ];
    }
    return [
        {
            label: '편광',
            value: p.polarization,
            info: 'Sentinel-1 기본 수신 조합으로 자동 설정됩니다.',
        },
        {
            label: '최대 시간 베이스라인',
            value: `${p.temporalBaselineMaxDays}일`,
            info: 'interferogram 페어 두 scene 간 허용 최대 시간 차이. 길수록 페어 수는 늘지만 시간적 디코히어런스가 증가합니다.',
        },
        {
            label: '최대 공간 베이스라인',
            value: `${p.spatialBaselineMaxM}m`,
            info: '두 acquisition 의 위성 궤도 간 허용 최대 수직 거리(perpendicular baseline).',
        },
        {
            label: '최소 코히어런스',
            value: p.coherenceMin.toFixed(2),
            info: 'interferogram 픽셀 마스킹 임계값. SBAS 는 분산형 산란체도 보존하므로 낮은 값을 사용합니다.',
        },
    ];
}

/**
 * 분석 유형에 맞춰 자동 적용되는 파라미터를 읽기 전용으로 표시한다.
 * 편광·코히어런스·베이스라인 등은 사용자가 직접 조정하지 않고, 유형 선택만으로 결정된다.
 */
function AutoParamsSection({ form, availableCount }: { form: RequestForm; availableCount: number }) {
    const rows = autoParamRows(form.type);
    // 기간/가용 scene 수에 따른 경고는 사용자 선택(AOI·기간)에 좌우되므로 그대로 안내한다.
    const warnings = form.type === 'DInSAR' ? [] : analysisRangeWarnings(form, availableCount);
    return (
        <Section
            title="자동 설정값"
            info="분석 유형에 맞춰 권장 파라미터가 자동으로 설정됩니다. 도메인 지식이 없어도 안전한 기본값으로 처리됩니다."
        >
            <div className="col gap-3">
                {warnings.length ? <RangeWarningList items={warnings} /> : null}
                <div
                    style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 6,
                        background: 'var(--bg-2)',
                        overflow: 'hidden',
                    }}
                >
                    {rows.map((r, i) => (
                        <div
                            key={r.label}
                            className="between"
                            style={{
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 10px',
                                borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)',
                            }}
                        >
                            <span
                                className="row"
                                style={{
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: 11.5,
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                {r.label}
                                {r.info ? <InfoTip text={r.info} size={11} /> : null}
                            </span>
                            <span className="mono tabular" style={{ fontSize: 11.5, fontWeight: 600 }}>
                                {r.value}
                            </span>
                        </div>
                    ))}
                </div>
                <div
                    className="row gap-2"
                    style={{
                        alignItems: 'flex-start',
                        fontSize: 10.5,
                        lineHeight: 1.45,
                        color: 'var(--text-tertiary)',
                    }}
                >
                    <Icon name="info" size={11} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span>
                        이 값들은 직접 조정하지 않아도 됩니다. 분석 유형만 고르면 나머지는 자동으로 맞춰집니다.
                    </span>
                </div>
            </div>
        </Section>
    );
}

/** 입력 옆에 뜨는 인라인 검증 에러 메시지. */
function FieldErrorMsg({ show, message }: { show: boolean; message?: string }) {
    if (!show) return null;
    return (
        <div
            className="row gap-2"
            style={{
                alignItems: 'flex-start',
                marginTop: 6,
                fontSize: 11,
                lineHeight: 1.4,
                color: 'var(--danger)',
            }}
        >
            <Icon name="info" size={11} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>{message}</span>
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
    selectedCount: number;
    availableCount: number;
    submitting: boolean;
    onSubmit: () => void;
    /** "이미지 선택" 클릭 시 폼 검증 — 통과하면 true (호출 측이 scene 탭으로 전환). */
    onProceedToScenes: () => boolean;
    /** 현재 검증 실패 필드/메시지 — 인라인 표시용. */
    fieldError: FieldError | null;
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
    onAutoExcludeScenes: () => void;
    /** 스택 기준(super-master) scene id — 각 scene B⊥ 를 이 기준 대비로 표시. DInSAR 은 null. */
    referenceSceneId: string | null;
    hoveredSceneId: string | null;
    onHoverScene: (id: string | null) => void;
}

function RequestSidebar({
    form,
    onChangeField,
    onChangeType,
    selectedCount,
    availableCount,
    submitting,
    onSubmit,
    onProceedToScenes,
    fieldError,
    onReset,
    dinsarOverlap,
    onAoiHover,
    onAoiApplied,
    scenes,
    selectedSceneIds,
    onToggleScene,
    onSelectAllScenes,
    onClearScenes,
    onAutoExcludeScenes,
    referenceSceneId,
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

                {/* 분석 이름 / 기간 — 각각 한 행씩 세로로 구분 */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="col gap-3">
                        <div className="col gap-2" style={{ minWidth: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>분석 이름</span>
                            <input
                                className="input"
                                value={form.name}
                                placeholder="예: Pohang 2026Q1"
                                onChange={(e) => onChangeField('name', e.target.value)}
                                style={{
                                    width: '100%',
                                    ...(fieldError?.field === 'name'
                                        ? { borderColor: 'var(--danger)' }
                                        : null),
                                }}
                            />
                            <FieldErrorMsg
                                show={fieldError?.field === 'name'}
                                message={fieldError?.message}
                            />
                        </div>
                        <div className="col gap-2" style={{ minWidth: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>기간</span>
                            <DateRangePicker
                                start={form.startDate}
                                end={form.endDate}
                                maxDate={new Date()}
                                onChange={(s, e) => {
                                    onChangeField('startDate', s);
                                    onChangeField('endDate', e);
                                }}
                            />
                        </div>
                    </div>
                </div>

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
                        <FieldErrorMsg
                            show={fieldError?.field === 'aoi'}
                            message={fieldError?.message}
                        />
                    </div>
                </Section>

                <Section
                    title="AOI 사전 점검"
                    hint="무거운 처리 전에 coherence·토지피복·경사를 진단하고 방법을 추천합니다."
                >
                    <AoiAssessPanel form={form} />
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
                    <FieldErrorMsg show={fieldError?.field === 'mission'} message={fieldError?.message} />
                </Section>

                <AutoParamsSection form={form} availableCount={availableCount} />

                {/* 산출 레이어는 분석 시 전부 생성된다. 어떤 레이어를 볼지는 결과 조회 화면에서 전환한다
                    (results/page.tsx 의 "레이어" 섹션). 요청 단계에서는 선택을 받지 않는다. */}
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
                    onAutoExclude={onAutoExcludeScenes}
                    referenceId={referenceSceneId}
                    analysisType={form.type}
                    dinsarOverlap={dinsarOverlap}
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
                        {form.type === 'DInSAR' ? 'scene 선택' : '스택'}{' '}
                        <span
                            className="mono tabular"
                            style={{
                                color:
                                    fieldError?.field === 'scenes'
                                        ? 'var(--danger)'
                                        : ready
                                          ? 'var(--success)'
                                          : 'var(--text-secondary)',
                            }}
                        >
                            {selectedCount}/{minSel}
                        </span>
                    </span>
                    <span className="faint mono tabular">사용 가능 {availableCount}</span>
                </div>
                <div className="row gap-2">
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={onReset}
                        disabled={submitting}
                    >
                        <Icon name="refresh" size={12} />
                    </button>
                    {sidebarTab === 'options' ? (
                        <button
                            type="button"
                            className="btn btn--primary"
                            style={{ flex: 1 }}
                            onClick={() => {
                                if (onProceedToScenes()) setSidebarTab('scenes');
                            }}
                        >
                            <Icon name="layers" size={13} /> 이미지 선택
                        </button>
                    ) : (
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
                    )}
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
    /** SBAS/PSInSAR — 기준 대비 |B⊥| 큰 불량일 일괄 제외(opt-out). */
    onAutoExclude: () => void;
    /** 스택 기준(super-master) scene id — 각 행 B⊥ 를 이 기준 대비로 표시. DInSAR 은 null. */
    referenceId: string | null;
    analysisType: AnalysisType;
    /** DInSAR master/slave 겹침 % — 두 scene 선택 시에만 값. */
    dinsarOverlap: number | null;
    hoveredId: string | null;
    onHover: (id: string | null) => void;
}

function ScenePickerInline({
    scenes,
    selected,
    onToggle,
    onSelectAll,
    onClear,
    onAutoExclude,
    referenceId,
    analysisType,
    dinsarOverlap,
    hoveredId,
    onHover,
}: ScenePickerInlineProps) {
    const minScenes = ANALYSIS_META[analysisType].minScenes;
    const ready = selected.size >= minScenes;
    const allSelected =
        analysisType === 'DInSAR'
            ? selected.size === 2 && scenes.length >= 2
            : scenes.length > 0 && selected.size >= scenes.length;

    // 스택 기준 scene 과 그 perpBaseline — 각 scene B⊥ 는 이 값 대비로 계산한다.
    const referenceScene = useMemo(
        () => scenes.find((s) => s.id === referenceId) ?? null,
        [scenes, referenceId],
    );
    const refPerp = referenceScene?.perpBaseline ?? 0;

    // 선택된 scene 들의 baseline 통계.
    const baselineSummary = useMemo(() => {
        if (selected.size < 2) return null;
        const picks = scenes.filter((s) => selected.has(s.id));
        if (picks.length < 2) return null;
        if (analysisType === 'DInSAR' && picks.length === 2) {
            // 처리 전이라 실측 coherence 는 알 수 없음 — 두 scene 의 시간 간격(temporal baseline)으로만
            // 가늠한다. Sentinel-1 재방문 12일, 2주기 24일까지는 양호로 본다.
            const t0 = new Date(picks[0]!.isoDate).getTime();
            const t1 = new Date(picks[1]!.isoDate).getTime();
            const days = Math.round(Math.abs(t1 - t0) / (24 * 60 * 60 * 1000));
            const quality = days <= 24 ? 'good' : 'caution';
            // DInSAR 은 master 가 곧 기준 — 페어 B⊥ = 두 scene perpBaseline 차이.
            const perp = Math.abs(picks[0]!.perpBaseline - picks[1]!.perpBaseline);
            return { mode: 'pair' as const, days, quality, perp };
        }
        // 스택: 각 scene 의 기준 대비 |B⊥| 분포.
        const abs = picks.map((s) => Math.abs(relPerpBaseline(s, refPerp)));
        const min = Math.min(...abs);
        const max = Math.max(...abs);
        const mean = Math.round(abs.reduce((s, v) => s + v, 0) / abs.length);
        return { mode: 'stack' as const, min, max, mean };
    }, [selected, scenes, analysisType, refPerp]);

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
                <div
                    className="faint"
                    style={{ fontSize: 10.5, marginTop: 4, lineHeight: 1.4 }}
                >
                    {analysisType === 'DInSAR'
                        ? '두 scene 선택 시 master/slave 자동 매칭'
                        : `범위 내 ${scenes.length}장이 기본 포함 — 품질 낮은 날짜만 제외하세요${
                              scenes.length - selected.size > 0
                                  ? ` (제외 ${scenes.length - selected.size}장)`
                                  : ''
                          }`}
                </div>
                {analysisType !== 'DInSAR' && referenceScene ? (
                    <div className="faint" style={{ fontSize: 10, marginTop: 3, lineHeight: 1.4 }}>
                        기준 scene{' '}
                        <span className="mono tabular" style={{ color: 'var(--text-secondary)' }}>
                            {referenceScene.date}
                        </span>{' '}
                        · 각 ⊥ 는 기준 대비 (실제 B⊥ 는 백엔드 궤도 계산)
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
                                <span style={{ color: 'var(--text-tertiary)' }}>시간 간격</span>{' '}
                                <span
                                    style={{
                                        fontWeight: 700,
                                        color:
                                            baselineSummary.quality === 'good'
                                                ? 'var(--success)'
                                                : 'var(--warning)',
                                    }}
                                >
                                    {baselineSummary.days}일
                                </span>{' '}
                                <span style={{ color: 'var(--text-tertiary)' }}>
                                    ·{' '}
                                    {baselineSummary.quality === 'good'
                                        ? 'coherence 양호'
                                        : 'coherence 주의'}
                                </span>{' '}
                                <span style={{ color: 'var(--text-tertiary)' }}>
                                    · B⊥ {baselineSummary.perp}m
                                </span>
                            </>
                        ) : (
                            <>
                                <span style={{ color: 'var(--text-tertiary)' }}>기준 대비 |B⊥|</span>{' '}
                                min {baselineSummary.min} · mean {baselineSummary.mean} · max{' '}
                                {baselineSummary.max} m
                            </>
                        )}
                    </div>
                ) : null}

                {analysisType === 'DInSAR' && dinsarOverlap !== null
                    ? (() => {
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
                                      marginTop: 6,
                                      padding: '5px 7px',
                                      fontSize: 11,
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
                    : null}
            </div>

            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                {scenes.length === 0 ? (
                    <div className="empty" style={{ padding: 20, fontSize: 11.5 }}>
                        가용 scene 이 없습니다 — AOI · 기간 · 미션을 확인하세요
                    </div>
                ) : (
                    scenes.map((s) => {
                        const isDinsar = analysisType === 'DInSAR';
                        const isSel = selected.has(s.id);
                        const isHov = hoveredId === s.id;
                        const isRef = !isDinsar && s.id === referenceId;
                        // 순서 칩은 DInSAR(master/slave) 에서만 의미가 있다.
                        const order = isDinsar && isSel ? Array.from(selected).indexOf(s.id) + 1 : null;
                        // opt-out: SBAS/PSInSAR 은 미선택 = 스택에서 제외된 날짜.
                        const excluded = !isDinsar && !isSel;
                        // 기준 대비 B⊥ (스택). DInSAR 은 기준이 없어 행에 표시하지 않는다.
                        const relPerp = relPerpBaseline(s, refPerp);
                        const lowQ = !isDinsar && isLowQualityScene(s, refPerp);
                        const missionColor = s.mission === 'S1A' ? '#22d3ee' : '#a855f7';
                        // 기준 scene 은 스택에서 항상 포함 — 제외 토글을 막는다.
                        const toggle = isRef ? undefined : () => onToggle(s.id);
                        return (
                            <div
                                key={s.id}
                                onClick={toggle}
                                onMouseEnter={() => onHover(s.id)}
                                onMouseLeave={() => onHover(null)}
                                style={{
                                    padding: '8px 10px',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    background:
                                        isDinsar && isSel
                                            ? 'var(--accent-soft)'
                                            : isHov
                                              ? 'var(--bg-2)'
                                              : undefined,
                                    borderLeft: isSel
                                        ? '3px solid var(--accent)'
                                        : '3px solid transparent',
                                    opacity: excluded ? 0.45 : 1,
                                    cursor: isRef ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={isSel}
                                    disabled={isRef}
                                    onChange={() => toggle?.()}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ flexShrink: 0 }}
                                />
                                {/* SLC 는 미리보기 미지원 — DInSAR 은 선택 순서 칩, 그 외엔 생략. */}
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
                                            className="row gap-1"
                                            style={{ marginLeft: 'auto', alignItems: 'center', flexShrink: 0 }}
                                        >
                                            {isRef ? (
                                                <span
                                                    title="스택 기준(super-master) scene — B⊥ 0m, 항상 포함"
                                                    style={{
                                                        fontSize: 9,
                                                        padding: '0 4px',
                                                        height: 14,
                                                        lineHeight: '13px',
                                                        borderRadius: 3,
                                                        background: 'var(--accent-soft)',
                                                        color: 'var(--accent)',
                                                        border: '1px solid var(--accent-border)',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    기준
                                                </span>
                                            ) : null}
                                            {lowQ ? (
                                                <span
                                                    title={`기준 대비 |B⊥| ${Math.abs(relPerp)}m > ${PERP_WARN_M}m — 기하 디코릴레이션 위험`}
                                                    style={{
                                                        fontSize: 9,
                                                        padding: '0 4px',
                                                        height: 14,
                                                        lineHeight: '13px',
                                                        borderRadius: 3,
                                                        background: 'var(--warning-soft)',
                                                        color: 'var(--warning)',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    주의
                                                </span>
                                            ) : null}
                                            {!isDinsar ? (
                                                <span
                                                    className="mono tabular"
                                                    title="기준 scene 대비 perpendicular baseline — 0 에 가까울수록 coherence 양호"
                                                    style={{
                                                        fontSize: 10,
                                                        color: lowQ ? 'var(--warning)' : 'var(--text-tertiary)',
                                                        fontWeight: lowQ ? 600 : 400,
                                                    }}
                                                >
                                                    ⊥{relPerp >= 0 ? '+' : ''}
                                                    {relPerp}m
                                                </span>
                                            ) : null}
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
                                            textDecoration: excluded ? 'line-through' : undefined,
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
                    {analysisType === 'DInSAR' ? '첫/마지막 페어' : '전체 포함'}
                </button>
                {analysisType === 'DInSAR' ? (
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={onClear}
                        disabled={selected.size === 0}
                        style={{ flex: '0 0 auto' }}
                    >
                        해제
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={onAutoExclude}
                        disabled={scenes.length === 0}
                        style={{ flex: '0 0 auto' }}
                        title={`기준 대비 |B⊥| > ${PERP_WARN_M}m 인 날짜를 스택에서 자동 제외`}
                    >
                        불량일 제외
                    </button>
                )}
            </div>
        </div>
    );
}

