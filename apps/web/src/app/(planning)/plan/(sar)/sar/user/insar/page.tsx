'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
    DateRangePicker,
    Icon,
    InfoTip,
    MapCanvas,
    Quicklook,
    useToast,
    type MapFootprint,
    type MapTool,
} from '@/_ui/hifi';

import { aoiToRing, useSavedAois, type SavedAoi } from '@/_shared/contexts/SavedAoisContext';
import { LoadAoiMenu, SaveAoiButton } from '../../_components/SavedAoiControls';
import { RequestTimelinePanel } from '../../_components/SceneTimelinePanel';

// ────────────────────────────────────────────────────────────────────────────
// 분석 유형
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

const typeBadge = (t: AnalysisType) =>
    t === 'DInSAR' ? 'badge--info' : t === 'SBAS' ? 'badge--warning' : 'badge--brand2';

// ────────────────────────────────────────────────────────────────────────────
// 요청 모델
// ────────────────────────────────────────────────────────────────────────────

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
    priority: 'normal' | 'urgent';
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
        priority: 'normal',
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
    perpBaseline: number;
    footprint: Array<[number, number]>;
}

function generateAvailableScenes(form: RequestForm): AvailableScene[] {
    const aoi = parseAoiFromForm(form);
    if (!aoi) return [];
    const missions: ('S1A' | 'S1C')[] = [];
    if (form.s1a) missions.push('S1A');
    if (form.s1c) missions.push('S1C');
    if (missions.length === 0) return [];
    const day = 24 * 60 * 60 * 1000;
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

type Tab = 'request' | 'scenes';

export default function InsarPage() {
    return (
        <Suspense fallback={null}>
            <InsarPageInner />
        </Suspense>
    );
}

function InsarPageInner() {
    const toast = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { getById: getSavedAoiById } = useSavedAois();
    const [tab, setTab] = useState<Tab>('request');

    const [request, setRequest] = useState<RequestForm>(() => buildDefaultRequest());
    const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(() => new Set());
    const [previewAoi, setPreviewAoi] = useState<SavedAoi | null>(null);
    const [fitKey, setFitKey] = useState('init');
    const [submitting, setSubmitting] = useState(false);
    const [activeTool, setActiveTool] = useState<MapTool | undefined>(undefined);
    const [hoveredSceneId, setHoveredSceneId] = useState<string | null>(null);
    const [fetchingScenes, setFetchingScenes] = useState(false);
    const fetchEnterRef = useRef<number | null>(null);
    const fetchExitRef = useRef<number | null>(null);
    const fetchInitialRef = useRef(true);

    // ?aoi=<savedAoiId> 진입 시 라이브러리에서 적용
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
            setTab('request');
            setFitKey(`fit-aoi-${found.id}-${Date.now()}`);
            toast(`"${found.name}" 적용됨`, { tone: 'success' });
        }
        if (pathname) router.replace(pathname);
    }, []);

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

    const requestAoi = useMemo(
        () => parseAoiFromForm(request),
        [request.nwLat, request.nwLon, request.seLat, request.seLon],
    );
    const availableScenes = useMemo(
        () => generateAvailableScenes(request),
        [
            request.startDate,
            request.endDate,
            request.s1a,
            request.s1c,
            request.nwLat,
            request.nwLon,
            request.seLat,
            request.seLon,
        ],
    );

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

    // AOI 그리기 / 편집
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

    useEffect(() => {
        if (activeTool !== 'bbox' && activeTool !== 'polygon') return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveTool(undefined);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [activeTool]);

    // 폼 조작
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

    /** '다음 → scene 선택' 버튼이 폼의 필수값을 가볍게 검증한 뒤 scenes 탭으로 이동. */
    const goToScenes = () => {
        if (!request.name.trim()) {
            toast('분석 이름을 먼저 입력해주세요', { tone: 'warning' });
            return;
        }
        if (!requestAoi) {
            toast('AOI 좌표를 확인해주세요', { tone: 'warning' });
            return;
        }
        if (!request.s1a && !request.s1c) {
            toast('미션을 하나 이상 선택해주세요', { tone: 'warning' });
            return;
        }
        setTab('scenes');
    };

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <div className="split" style={{ flex: 1 }}>
                <aside
                    className="split__side split__side--left"
                    style={{ width: 320, display: 'flex', flexDirection: 'column' }}
                >
                    <SidebarTabs
                        tab={tab}
                        onChange={setTab}
                        selectedCount={selectedSceneIds.size}
                        minSel={ANALYSIS_META[request.type].minScenes}
                    />
                    {tab === 'request' ? (
                        <RequestSidebar
                            form={request}
                            onChangeField={updateRequest}
                            onChangeType={setRequestType}
                            onToggleLayer={toggleRequestLayer}
                            onReset={resetRequest}
                            onNext={goToScenes}
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
                        />
                    ) : (
                        <SceneSidebar
                            scenes={availableScenes}
                            selected={selectedSceneIds}
                            onToggle={toggleSceneSelection}
                            onSelectAll={selectAllScenes}
                            onClear={clearSelectedScenes}
                            analysisType={request.type}
                            hoveredId={hoveredSceneId}
                            onHover={setHoveredSceneId}
                            fetching={fetchingScenes}
                            dinsarOverlap={dinsarOverlap}
                            submitting={submitting}
                            onBack={() => setTab('request')}
                            onSubmit={submitRequest}
                        />
                    )}
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
                            onAoiChange={previewAoi ? undefined : handleMapAoiEdit}
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
// 사이드바 — 탭바
// ────────────────────────────────────────────────────────────────────────────

function SidebarTabs({
    tab,
    onChange,
    selectedCount,
    minSel,
}: {
    tab: Tab;
    onChange: (t: Tab) => void;
    selectedCount: number;
    minSel: number;
}) {
    const items: [Tab, string, ReactNode][] = [
        ['request', '요청', null],
        [
            'scenes',
            'scene 선택',
            <span
                key="badge"
                className="mono tabular"
                style={{
                    marginLeft: 5,
                    fontSize: 10.5,
                    color:
                        selectedCount >= minSel ? 'var(--success)' : 'var(--text-tertiary)',
                }}
            >
                {selectedCount}/{minSel}
            </span>,
        ],
    ];
    return (
        <div
            className="row"
            style={{
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-1)',
                padding: '0 12px',
                gap: 4,
                flexShrink: 0,
            }}
        >
            {items.map(([k, label, extra]) => {
                const active = tab === k;
                return (
                    <button
                        key={k}
                        type="button"
                        onClick={() => onChange(k)}
                        style={{
                            flex: 1,
                            padding: '12px 8px',
                            background: 'none',
                            border: 0,
                            borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                            color: active ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: active ? 600 : 500,
                            fontSize: 13,
                            cursor: 'pointer',
                            marginBottom: -1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {label}
                        {extra}
                    </button>
                );
            })}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 사이드바 — 요청 폼
// ────────────────────────────────────────────────────────────────────────────

interface RequestSidebarProps {
    form: RequestForm;
    onChangeField: <K extends keyof RequestForm>(key: K, value: RequestForm[K]) => void;
    onChangeType: (t: AnalysisType) => void;
    onToggleLayer: (k: string) => void;
    onReset: () => void;
    onNext: () => void;
    onAoiHover: (aoi: SavedAoi | null) => void;
    onAoiApplied: (aoi: SavedAoi) => void;
}

function RequestSidebar({
    form,
    onChangeField,
    onChangeType,
    onToggleLayer,
    onReset,
    onNext,
    onAoiHover,
    onAoiApplied,
}: RequestSidebarProps) {
    return (
        <>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
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

                <Section
                    title="AOI (관심 영역)"
                    hint="WGS84 위경도. 지도에서 그리거나 라이브러리에서 불러올 수 있습니다."
                >
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
                            <LabeledInput label="NW lat" value={form.nwLat} onChange={(v) => onChangeField('nwLat', v)} />
                            <LabeledInput label="NW lon" value={form.nwLon} onChange={(v) => onChangeField('nwLon', v)} />
                        </div>
                        <div className="row gap-2">
                            <LabeledInput label="SE lat" value={form.seLat} onChange={(v) => onChangeField('seLat', v)} />
                            <LabeledInput label="SE lon" value={form.seLon} onChange={(v) => onChangeField('seLon', v)} />
                        </div>
                    </div>
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
                                info="픽셀별 위상 신뢰도(0~1). 이 값 미만의 픽셀은 결과에서 마스킹됩니다."
                            />
                            <div className="faint" style={{ fontSize: 11, lineHeight: 1.5 }}>
                                Master/Slave 쌍은 scene 선택 탭에서 직접 두 scene 을 선택하세요.
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
                                info="시계열 분석에 사용할 최소 scene 장수."
                            />
                            <NumberField
                                label="PS 코히어런스 임계값"
                                value={form.coherenceMin}
                                step={0.05}
                                min={0}
                                max={1}
                                onChange={(v) => onChangeField('coherenceMin', v)}
                                hint="0.7 권장"
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
                            />
                            <NumberField
                                label="최대 공간 베이스라인 (m)"
                                value={form.spatialBaselineMaxM}
                                step={50}
                                min={50}
                                onChange={(v) => onChangeField('spatialBaselineMaxM', v)}
                                hint="200m 권장"
                            />
                            <NumberField
                                label="최소 코히어런스"
                                value={form.coherenceMin}
                                step={0.05}
                                min={0}
                                max={1}
                                onChange={(v) => onChangeField('coherenceMin', v)}
                                hint="0.3 권장"
                            />
                        </div>
                    </Section>
                ) : null}

                <Section title="산출 레이어">
                    <div className="col gap-2">
                        {(
                            [
                                ['mean_velocity', 'mean_velocity', 'mm/yr', '평균 LOS 변위 속도'],
                                ['coherence', 'coherence', '0–1', '평균 코히어런스'],
                                ['cumulative_disp', 'cumulative_disp', 'mm', '누적 변위'],
                                ['wrapped_phase', 'wrapped_phase', 'rad', 'wrapped phase 맵'],
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
                                        style={{
                                            fontSize: 11,
                                            marginLeft: 'auto',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                        }}
                                    >
                                        {unit}
                                        <InfoTip text={desc} size={11} placement="left" />
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </Section>

                <Section title="우선순위">
                    <div className="row gap-1">
                        <span
                            className={`chip${form.priority === 'normal' ? ' chip--active' : ''}`}
                            onClick={() => onChangeField('priority', 'normal')}
                        >
                            보통
                        </span>
                        <span
                            className={`chip${form.priority === 'urgent' ? ' chip--active' : ''}`}
                            onClick={() => onChangeField('priority', 'urgent')}
                        >
                            긴급
                        </span>
                        <InfoTip text="긴급은 워커 큐에서 우선 배치되지만, 처리 시간을 보장하지는 않습니다." />
                    </div>
                </Section>
            </div>

            <div
                style={{
                    flexShrink: 0,
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-1)',
                    padding: 12,
                }}
            >
                <div className="row gap-2">
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={onReset}
                        aria-label="요청 폼 초기화"
                    >
                        <Icon name="refresh" size={12} />
                    </button>
                    <button
                        type="button"
                        className="btn btn--primary"
                        style={{ flex: 1 }}
                        onClick={onNext}
                    >
                        다음 — scene 선택 <Icon name="chevronRight" size={13} />
                    </button>
                </div>
            </div>
        </>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 사이드바 — scene 선택
// ────────────────────────────────────────────────────────────────────────────

interface SceneSidebarProps {
    scenes: AvailableScene[];
    selected: Set<string>;
    onToggle: (id: string) => void;
    onSelectAll: () => void;
    onClear: () => void;
    analysisType: AnalysisType;
    hoveredId: string | null;
    onHover: (id: string | null) => void;
    fetching: boolean;
    dinsarOverlap: number | null;
    submitting: boolean;
    onBack: () => void;
    onSubmit: () => void;
}

function SceneSidebar({
    scenes,
    selected,
    onToggle,
    onSelectAll,
    onClear,
    analysisType,
    hoveredId,
    onHover,
    fetching,
    dinsarOverlap,
    submitting,
    onBack,
    onSubmit,
}: SceneSidebarProps) {
    const minScenes = ANALYSIS_META[analysisType].minScenes;
    const ready = selected.size >= minScenes;
    const requirement = ANALYSIS_META[analysisType].sceneRequirement;
    const allSelected =
        analysisType === 'DInSAR'
            ? selected.size === 2 && scenes.length >= 2
            : scenes.length > 0 && selected.size >= scenes.length;

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
        <>
            <div
                style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border-subtle)',
                    flexShrink: 0,
                }}
            >
                <div className="row gap-2 between" style={{ alignItems: 'center' }}>
                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>scene 선택</span>
                        <span className={`badge ${typeBadge(analysisType)}`} style={{ fontSize: 10 }}>
                            {analysisType}
                        </span>
                    </div>
                </div>
                <div className="row gap-2" style={{ alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
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
                        {selected.size}/{minScenes} 선택
                    </span>
                    <span className="faint" style={{ fontSize: 11 }}>
                        필요 {requirement}
                    </span>
                </div>
                <div className="faint" style={{ fontSize: 10.5, marginTop: 4, lineHeight: 1.45 }}>
                    {scenes.length}개 가용
                    {analysisType === 'DInSAR' ? ' · 두 scene 선택 시 master/slave 자동 매칭' : ''}
                </div>

                <div
                    style={{
                        marginTop: 8,
                        padding: '7px 9px',
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                    }}
                >
                    <div className="row gap-2" style={{ alignItems: 'center', fontSize: 10.5 }}>
                        <Icon name="satellite" size={11} style={{ color: 'var(--success)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            B⊥ 사전계산 완료
                        </span>
                        <span className="faint">· POEORB orbit 기반</span>
                        <span style={{ marginLeft: 'auto', display: 'inline-flex' }}>
                            <BaselineHelpButton />
                        </span>
                    </div>
                    <div
                        className="mono tabular"
                        style={{
                            fontSize: 10.5,
                            color: 'var(--text-secondary)',
                            paddingTop: 3,
                            borderTop: '1px solid var(--border-subtle)',
                            minHeight: 18,
                        }}
                    >
                        {baselineSummary ? (
                            baselineSummary.mode === 'pair' ? (
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
                                        · {baselineSummary.quality === 'good'
                                            ? 'coherence 양호'
                                            : baselineSummary.quality === 'marginal'
                                              ? 'coherence 경계'
                                              : 'coherence 위험'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span style={{ color: 'var(--text-tertiary)' }}>스택 |B⊥|</span> min{' '}
                                    {baselineSummary.min} · mean {baselineSummary.mean} · max{' '}
                                    {baselineSummary.max} m
                                </>
                            )
                        ) : (
                            <span
                                style={{
                                    color: 'var(--text-tertiary)',
                                    fontFamily: 'var(--font-sans)',
                                    fontStyle: 'italic',
                                }}
                            >
                                2개 이상 선택 시 baseline 통계 표시
                            </span>
                        )}
                    </div>
                </div>

                {dinsarOverlap !== null
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
                                      marginTop: 8,
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
                                      <span style={{ color: tone.color, fontSize: 10.5 }}>· {tone.label}</span>
                                  </span>
                                  <InfoTip text="DInSAR 권장 겹침: ≥80% 안정 / 70~80% 권장 하한 / <70% 분석 가용 면적이 좁음." />
                              </div>
                          );
                      })()
                    : null}
            </div>

            <div style={{ flex: 1, overflow: 'auto', position: 'relative', minHeight: 0 }}>
                {scenes.length === 0 && !fetching ? (
                    <div className="empty" style={{ padding: 24, fontSize: 12 }}>
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
                                    padding: '10px 12px',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    background: isSel ? 'var(--accent-soft)' : isHov ? 'var(--bg-2)' : undefined,
                                    borderLeft: isSel ? '3px solid var(--accent)' : '3px solid transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
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
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <Quicklook sceneId={s.id} size={44} />
                                    {order ? (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: -4,
                                                right: -4,
                                                width: 18,
                                                height: 18,
                                                borderRadius: '50%',
                                                background: 'var(--accent)',
                                                color: '#fff',
                                                fontSize: 10,
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '1.5px solid var(--bg-1)',
                                                fontFamily: 'var(--font-mono)',
                                            }}
                                        >
                                            {order}
                                        </span>
                                    ) : null}
                                </div>
                                <div className="col" style={{ flex: 1, gap: 3, minWidth: 0 }}>
                                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                                        <span
                                            style={{
                                                fontSize: 10,
                                                padding: '0 5px',
                                                height: 15,
                                                lineHeight: '14px',
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
                                        <span
                                            className="faint mono tabular"
                                            style={{ fontSize: 10.5 }}
                                        >
                                            {s.pass}
                                        </span>
                                        <span
                                            className="mono tabular"
                                            style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}
                                        >
                                            {s.date}
                                        </span>
                                        <span
                                            className="faint mono tabular"
                                            title="perpendicular baseline — 두 SAR scene 의 시선(LOS) 직각 방향 거리"
                                            style={{ fontSize: 10.5, marginLeft: 'auto' }}
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
                    padding: 10,
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-2)',
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                }}
            >
                <div style={{ display: 'flex', gap: 6 }}>
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
                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        type="button"
                        className="btn btn--sm"
                        onClick={onBack}
                        disabled={submitting}
                    >
                        <Icon name="chevronRight" size={12} style={{ transform: 'rotate(180deg)' }} /> 이전
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
// 공통 헬퍼 컴포넌트
// ────────────────────────────────────────────────────────────────────────────

function Section({
    title,
    hint,
    info,
    children,
}: {
    title: string;
    hint?: string;
    info?: string;
    children: ReactNode;
}) {
    return (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="col" style={{ gap: 2, marginBottom: 8 }}>
                <div className="row" style={{ alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{title}</span>
                    {info ? <InfoTip text={info} size={12} /> : null}
                </div>
                {hint ? (
                    <span className="faint" style={{ fontSize: 11, lineHeight: 1.5 }}>
                        {hint}
                    </span>
                ) : null}
            </div>
            {children}
        </div>
    );
}

function LabeledInput({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <label className="col" style={{ gap: 4, flex: 1 }}>
            <span className="faint" style={{ fontSize: 10.5 }}>
                {label}
            </span>
            <input
                className="input mono tabular"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{ height: 30, fontSize: 12 }}
            />
        </label>
    );
}

function NumberField({
    label,
    value,
    onChange,
    step,
    min,
    max,
    hint,
    info,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    max?: number;
    hint?: string;
    info?: string;
}) {
    return (
        <div className="col" style={{ gap: 3 }}>
            <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                <span className="row" style={{ alignItems: 'center', gap: 5, flex: 1, fontSize: 11.5 }}>
                    {label}
                    {info ? <InfoTip text={info} size={11} /> : null}
                </span>
                <input
                    type="number"
                    className="input mono tabular"
                    value={value}
                    step={step}
                    min={min}
                    max={max}
                    onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (Number.isFinite(v)) onChange(v);
                    }}
                    style={{ width: 88, height: 28, fontSize: 12 }}
                />
            </div>
            {hint ? (
                <span className="faint" style={{ fontSize: 10.5, lineHeight: 1.45 }}>
                    {hint}
                </span>
            ) : null}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// baseline 도움말 — 수직 baseline ⊥ 설명
// ────────────────────────────────────────────────────────────────────────────

const MATH_FONT = '"Cambria Math", "STIX Two Math", "Latin Modern Math", "Times New Roman", serif';

function MEq({ display, children }: { display?: boolean; children: ReactNode }) {
    if (display) {
        return (
            <div
                style={{
                    fontFamily: MATH_FONT,
                    margin: '8px 0',
                    padding: '8px 10px',
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 4,
                    fontSize: 13,
                    textAlign: 'center',
                    lineHeight: 1.7,
                    letterSpacing: '0.01em',
                }}
            >
                {children}
            </div>
        );
    }
    return (
        <span
            style={{
                fontFamily: MATH_FONT,
                fontSize: '1.05em',
                letterSpacing: '0.01em',
            }}
        >
            {children}
        </span>
    );
}

function MV({ children }: { children: ReactNode }) {
    return <span style={{ fontStyle: 'italic' }}>{children}</span>;
}

function MSub({ children }: { children: ReactNode }) {
    return (
        <sub
            style={{
                fontStyle: 'normal',
                fontFamily: MATH_FONT,
                fontSize: '0.72em',
                letterSpacing: 0,
            }}
        >
            {children}
        </sub>
    );
}

type BaselineHelpTab = 'overview' | 'dinsar' | 'stack' | 'workflow';

const BASELINE_HELP_TABS: { key: BaselineHelpTab; label: string }[] = [
    { key: 'overview', label: '개요' },
    { key: 'dinsar', label: 'DInSAR' },
    { key: 'stack', label: 'SBAS/PS' },
    { key: 'workflow', label: '사전계산' },
];

function BaselineHelpButton() {
    const ref = useRef<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<BaselineHelpTab>('overview');
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        const onClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (ref.current && ref.current.contains(target)) return;
            const popoverEl = document.getElementById('baseline-help-popover');
            if (popoverEl && popoverEl.contains(target)) return;
            setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('mousedown', onClickOutside);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('mousedown', onClickOutside);
        };
    }, [open]);

    useEffect(() => {
        if (!open || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const w = 360;
        const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
        setCoords({ top: r.bottom + 8, left });
    }, [open]);

    return (
        <>
            <button
                ref={ref}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((o) => !o);
                }}
                aria-label="수직 baseline 설명"
                aria-expanded={open}
                style={{
                    background: 'transparent',
                    border: 0,
                    padding: 0,
                    cursor: 'help',
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: open ? 'var(--accent)' : 'var(--text-tertiary)',
                }}
            >
                <Icon name="info" size={12} />
            </button>
            {open && coords && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          id="baseline-help-popover"
                          role="dialog"
                          aria-label="수직 baseline 설명"
                          style={{
                              position: 'fixed',
                              top: coords.top,
                              left: coords.left,
                              zIndex: 9999,
                              width: 360,
                              maxHeight: 'calc(100vh - 24px)',
                              display: 'flex',
                              flexDirection: 'column',
                              background: 'var(--bg-2)',
                              border: '1px solid var(--border-default)',
                              borderRadius: 6,
                              boxShadow: 'var(--shadow-md)',
                              fontSize: 11.5,
                              lineHeight: 1.55,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                          }}
                      >
                          <div
                              className="between"
                              style={{ alignItems: 'center', padding: '10px 14px 8px', flexShrink: 0 }}
                          >
                              <span style={{ fontWeight: 700, fontSize: 12.5 }}>
                                  수직 baseline (
                                  <MEq>
                                      <MV>B</MV>
                                      <MSub>⊥</MSub>
                                  </MEq>
                                  )
                              </span>
                              <button
                                  type="button"
                                  onClick={() => setOpen(false)}
                                  aria-label="닫기"
                                  style={{
                                      background: 'transparent',
                                      border: 0,
                                      padding: 2,
                                      cursor: 'pointer',
                                      color: 'var(--text-tertiary)',
                                      display: 'inline-flex',
                                  }}
                              >
                                  <Icon name="x" size={11} />
                              </button>
                          </div>
                          <div
                              role="tablist"
                              aria-label="baseline 도움말 탭"
                              style={{
                                  display: 'flex',
                                  borderBottom: '1px solid var(--border-subtle)',
                                  padding: '0 8px',
                                  gap: 2,
                                  flexShrink: 0,
                              }}
                          >
                              {BASELINE_HELP_TABS.map((t) => {
                                  const active = tab === t.key;
                                  return (
                                      <button
                                          key={t.key}
                                          type="button"
                                          role="tab"
                                          aria-selected={active}
                                          onClick={() => setTab(t.key)}
                                          style={{
                                              flex: 1,
                                              padding: '6px 4px',
                                              background: 'none',
                                              border: 0,
                                              borderBottom: active
                                                  ? '2px solid var(--accent)'
                                                  : '2px solid transparent',
                                              color: active ? 'var(--accent)' : 'var(--text-secondary)',
                                              fontWeight: active ? 600 : 500,
                                              fontSize: 11,
                                              cursor: 'pointer',
                                              marginBottom: -1,
                                          }}
                                      >
                                          {t.label}
                                      </button>
                                  );
                              })}
                          </div>
                          <div role="tabpanel" style={{ padding: '12px 14px', overflow: 'auto', minHeight: 0 }}>
                              {tab === 'overview' ? <BaselineTabOverview /> : null}
                              {tab === 'dinsar' ? <BaselineTabDinsar /> : null}
                              {tab === 'stack' ? <BaselineTabStack /> : null}
                              {tab === 'workflow' ? <BaselineTabWorkflow /> : null}
                          </div>
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}

function BaselineTabOverview() {
    return (
        <>
            <p style={{ margin: '0 0 8px 0' }}>
                두 SAR 촬영 시점의 위성 위치 차이를 시선(LOS) 직각 방향으로 투영한 길이입니다.
                간섭쌍(InSAR) 의 품질을 결정하는 핵심 파라미터예요.
            </p>
            <MEq display>
                <MV>B</MV>
                <MSub>⊥</MSub> = | <MV>B</MV> − ( <MV>B</MV> · <MV>r̂</MV> ) <MV>r̂</MV> |
            </MEq>
            <div
                style={{
                    fontSize: 10.5,
                    color: 'var(--text-tertiary)',
                    margin: '-2px 0 8px 0',
                    textAlign: 'center',
                }}
            >
                <MV>B</MV> = baseline 벡터, <MV>r̂</MV> = LOS 단위벡터
            </div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>해석 가이드</div>
            <ul style={{ margin: '0 0 8px 0', paddingLeft: 16 }}>
                <li>
                    <MEq>
                        | <MV>B</MV>
                        <MSub>⊥</MSub> |
                    </MEq>{' '}
                    작음 (&lt; 150 m): coherence 양호 → DInSAR · 시계열에 적합
                </li>
                <li>
                    <MEq>
                        | <MV>B</MV>
                        <MSub>⊥</MSub> |
                    </MEq>{' '}
                    큼 (&gt; 200 m): 지형 민감도 ↑ → DEM 추출엔 유리하나 변위 분석엔 불리
                </li>
            </ul>
        </>
    );
}

function BaselineTabDinsar() {
    return (
        <>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                페어{' '}
                <MEq>
                    <MV>B</MV>
                    <MSub>⊥</MSub>
                </MEq>
            </div>
            <p style={{ margin: '0 0 4px 0' }}>선택한 두 scene 사이의 상대 baseline.</p>
            <MEq display>
                <MV>B</MV>
                <MSub>⊥, pair</MSub> = | <MV>B</MV>
                <MSub>⊥, M</MSub> − <MV>B</MV>
                <MSub>⊥, S</MSub> |
            </MEq>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>품질 임계값</div>
            <ul style={{ margin: '0 0 8px 0', paddingLeft: 16 }}>
                <li>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>양호</span> (&lt; 150 m):
                    coherence 우수
                </li>
                <li>
                    <span style={{ color: 'var(--warning)', fontWeight: 600 }}>경계</span> (150 ~ 250 m):
                    사용 가능, 노이즈 증가
                </li>
                <li>
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>위험</span> (&gt; 250 m):
                    coherence 저하
                </li>
            </ul>
        </>
    );
}

function BaselineTabStack() {
    return (
        <>
            <p style={{ margin: '0 0 8px 0' }}>
                SBAS/PSInSAR 는 여러 페어로 짠 네트워크라 단일 수치로 평가가 안 됩니다.{' '}
                <MEq>
                    | <MV>B</MV>
                    <MSub>⊥</MSub> |
                </MEq>{' '}
                의 min / mean / max 분포로 요약합니다.
            </p>
            <ul style={{ margin: '0 0 8px 0', paddingLeft: 16 }}>
                <li>
                    <strong>SBAS</strong>:{' '}
                    <MEq>
                        | <MV>B</MV>
                        <MSub>⊥</MSub> | &lt; <MV>B</MV>
                        <MSub>th</MSub>
                    </MEq>{' '}
                    (보통 150 m) 페어로 small-baseline 네트워크 구성
                </li>
                <li>
                    <strong>PSInSAR</strong>: 단일 master + 모든 secondary 페어. max | B⊥ | 가 한계 결정
                </li>
            </ul>
        </>
    );
}

function BaselineTabWorkflow() {
    return (
        <>
            <p style={{ margin: '0 0 8px 0' }}>
                <MEq>
                    <MV>B</MV>
                    <MSub>⊥</MSub>
                </MEq>{' '}
                는 SLC 픽셀 처리 전, ESA <strong>정밀 궤도 (POEORB)</strong> 메타데이터만으로 산출
                가능합니다.
            </p>
            <ul style={{ margin: '0 0 8px 0', paddingLeft: 16 }}>
                <li>POEORB 정확도: ±5 cm (위성 위치)</li>
                <li>가용 시점: 촬영 후 ~20일 (실시간 시 RESORB ±10 cm 대체)</li>
                <li>파일 크기: 수백 KB (SLC 는 GB 단위)</li>
            </ul>
            <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: 10.5 }}>
                전체 SLC 스택을 다운로드하지 않고도 페어링 적합성을 미리 판단할 수 있어, 실패할 페어에
                대한 다운로드/처리 비용을 절감합니다.
            </p>
        </>
    );
}
