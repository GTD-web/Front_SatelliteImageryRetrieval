'use client';

import {
    Suspense,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useHifiCart, type HifiScene } from '@/_shared/contexts/HifiCartContext';
import { aoiToRing, useSavedAois, type SavedAoi } from '@/_shared/contexts/SavedAoisContext';
import {
    DateRangePicker,
    Icon,
    InfoTip,
    MapCanvas,
    Modal,
    Quicklook,
    useToast,
    type MapFootprint,
} from '@/_ui/hifi';
import type { MapTool } from '@/_ui/hifi';

import { MOCK_DEFAULT_AOI, MOCK_SCENES } from '../../../../_mocks/scenes';
import { LoadAoiMenu, SaveAoiButton } from '../../_components/SavedAoiControls';
import { RequestTimelinePanel } from '../../_components/SceneTimelinePanel';

type ProductMode = 'slc' | 'others';
type AoiField = 'nwLat' | 'nwLon' | 'seLat' | 'seLon';

/** 검색 가능한 위성 플랫폼. 'S1' 은 정식 지원, 'S2' 는 광학 필터 UI 만 목업, 나머지는 준비 중. */
type Platform = 'S1' | 'S2' | 'umbra' | 'capella' | 'kompsat';

interface PlatformDef {
    value: Platform;
    label: string;
    kind: 'SAR' | 'EO';
    ready: boolean;
    note?: string;
}

const PLATFORMS: PlatformDef[] = [
    { value: 'S1', label: 'Sentinel-1 (SAR)', kind: 'SAR', ready: true },
    { value: 'S2', label: 'Sentinel-2 (광학)', kind: 'EO', ready: true, note: '광학 필터 미리보기' },
    { value: 'umbra', label: 'Umbra (SAR)', kind: 'SAR', ready: false, note: '연동 준비 중' },
    { value: 'capella', label: 'Capella (SAR)', kind: 'SAR', ready: false, note: '연동 준비 중' },
    { value: 'kompsat', label: 'KOMPSAT (광학/SAR)', kind: 'EO', ready: false, note: '연동 준비 중' },
];

interface S2Filters {
    level: 'L1C' | 'L2A';
    cloudMax: number;
    bands: string[];
}

function buildDefaultS2Filters(): S2Filters {
    return { level: 'L2A', cloudMax: 30, bands: ['TCI'] };
}

interface Filters {
    s1a: boolean;
    s1c: boolean;
    productMode: ProductMode;
    grd: boolean;
    ocn: boolean;
    raw: boolean;
    pol: string[];
    passA: boolean;
    passD: boolean;
    haveOnly: boolean;
    esaRefresh: boolean;
    startDate: Date;
    endDate: Date;
    datePreset: '1주' | '1개월' | '3개월' | '1년' | '';
}

/** 오늘 기준 preset 범위를 계산해 [start, end]를 반환. */
function presetRange(preset: '1주' | '1개월' | '3개월' | '1년'): [Date, Date] {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    if (preset === '1주') start.setDate(end.getDate() - 7);
    else if (preset === '1개월') start.setMonth(end.getMonth() - 1);
    else if (preset === '3개월') start.setMonth(end.getMonth() - 3);
    else start.setFullYear(end.getFullYear() - 1);
    return [start, end];
}

/**
 * Platform 별로 다른 분기 — S1 은 기존 `Filters`, S2 는 별도 `S2Filters` 로 평가.
 * 그 외 플랫폼(Umbra/Capella/KOMPSAT)은 mock 카탈로그가 없으므로 항상 빈 결과.
 */
function sceneMatches(s: HifiScene, f: Filters, platform: Platform, s2: S2Filters): boolean {
    if (platform === 'S1') {
        if (s.mission !== 'S1A' && s.mission !== 'S1C') return false;
        if (s.mission === 'S1A' && !f.s1a) return false;
        if (s.mission === 'S1C' && !f.s1c) return false;
        if (f.productMode === 'slc') {
            if (s.product !== 'SLC') return false;
        } else {
            if (s.product === 'SLC') return false;
            if (s.product === 'GRD' && !f.grd) return false;
            if (s.product === 'OCN' && !f.ocn) return false;
            if (s.product === 'RAW' && !f.raw) return false;
        }
        if (f.pol.length > 0 && (!s.pol || !f.pol.includes(s.pol))) return false;
        if (f.haveOnly && !s.have) return false;
        return true;
    }
    if (platform === 'S2') {
        // Sentinel-2 광학 — mission S2A/S2B/S2C, product L1C/L2A, cloudCover 검사.
        if (s.mission !== 'S2A' && s.mission !== 'S2B' && s.mission !== 'S2C') return false;
        if (s.product !== s2.level) return false;
        if (typeof s.cloudCover === 'number' && s.cloudCover > s2.cloudMax) return false;
        if (f.haveOnly && !s.have) return false;
        return true;
    }
    // umbra / capella / kompsat — 연동 미지원
    return false;
}

function buildDefaultFilters(): Filters {
    const [start, end] = presetRange('1개월');
    return {
        s1a: true,
        s1c: true,
        productMode: 'slc',
        grd: true,
        ocn: false,
        raw: false,
        pol: ['VV+VH'],
        passA: true,
        passD: true,
        haveOnly: false,
        esaRefresh: false,
        startDate: start,
        endDate: end,
        datePreset: '1개월',
    };
}

function FilterDivider() {
    return (
        <hr
            style={{
                border: 0,
                height: 1,
                background: 'var(--border-subtle)',
                margin: 0,
            }}
        />
    );
}

export default function SearchPage() {
    // useSearchParams 가 SSR 시 Suspense 경계를 요구. 페이지 본체를 별도 컴포넌트로 감싸 처리.
    return (
        <Suspense fallback={null}>
            <SearchPageInner />
        </Suspense>
    );
}

function SearchPageInner() {
    const toast = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { has: inCart, add: addToCart, addMany: addManyToCart } = useHifiCart();
    const { getById: getSavedAoiById } = useSavedAois();

    const [sceneModal, setSceneModal] = useState<HifiScene | null>(null);
    const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
    const [aoi, setAoi] = useState<Array<[number, number]> | null>(MOCK_DEFAULT_AOI);
    /** 저장된 AOI 메뉴에서 호버 중인 항목. 지도에 임시 미리보기로 그려지지만 검색/필터 상태에는 영향 없음. */
    const [previewAoi, setPreviewAoi] = useState<SavedAoi | null>(null);
    const [activeTool, setActiveTool] = useState<MapTool | undefined>(undefined);
    const [query, setQuery] = useState('');
    const [checked, setChecked] = useState<Set<string>>(() => new Set());
    const [platform, setPlatform] = useState<Platform>('S1');
    const [filters, setFilters] = useState<Filters>(() => buildDefaultFilters());
    const [appliedFilters, setAppliedFilters] = useState<Filters>(() => buildDefaultFilters());
    const [s2Filters, setS2Filters] = useState<S2Filters>(() => buildDefaultS2Filters());
    const [nwInput, setNwInput] = useState({ lat: '', lon: '' });
    const [seInput, setSeInput] = useState({ lat: '', lon: '' });
    const [aoiErrors, setAoiErrors] = useState<Set<AoiField>>(() => new Set());
    const [hasSearched, setHasSearched] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [pendingSearch, setPendingSearch] = useState(false);
    const [fitKey, setFitKey] = useState('init');
    const [resultsOpen, setResultsOpen] = useState(true);
    const [resultsTab, setResultsTab] = useState<'list' | 'timeline'>('list');
    const [aoiOpen, setAoiOpen] = useState(false);
    const [aoiPopPos, setAoiPopPos] = useState<{ top: number; left: number } | null>(null);
    const [aoiMounted, setAoiMounted] = useState(false);
    const aoiTriggerRef = useRef<HTMLButtonElement | null>(null);
    const aoiPopRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        setAoiMounted(true);
    }, []);

    // ?aoi=<savedAoiId> 로 진입한 경우 라이브러리에서 찾아 즉시 적용한 뒤 쿼리 정리.
    // AOI 가 적용되면 곧바로 검색을 시작해 "scene 검색 중…" 오버레이가 뜨도록 한다 (InSAR 와 동일 UX).
    // 효과는 mount 1 회만 실행되도록 의도. searchParams 변동에는 반응하지 않음.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const aoiParam = searchParams?.get('aoi');
        if (!aoiParam) return;
        const found = getSavedAoiById(aoiParam);
        if (!found) {
            toast('저장된 AOI 를 찾을 수 없습니다', { tone: 'warning' });
        } else {
            setAoi(aoiToRing(found));
            setFitKey(`fit-aoi-${found.id}-${Date.now()}`);
            toast(`"${found.name}" 적용됨`, { tone: 'success' });
            executeSearch(filters, { refit: false });
        }
        // 쿼리스트링 제거(뒤로가기 시 또 적용되지 않도록).
        if (pathname) router.replace(pathname);
    }, []);
    useEffect(() => {
        if (!aoiOpen) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (aoiTriggerRef.current?.contains(t)) return;
            if (aoiPopRef.current?.contains(t)) return;
            setAoiOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAoiOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [aoiOpen]);
    useLayoutEffect(() => {
        if (!aoiOpen) return;
        const compute = () => {
            const rect = aoiTriggerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const POP_W = 320;
            const viewportW = window.innerWidth;
            let left = rect.left;
            if (left + POP_W > viewportW - 8) left = Math.max(8, viewportW - POP_W - 8);
            setAoiPopPos({ top: rect.bottom + 6, left });
        };
        compute();
        window.addEventListener('resize', compute);
        window.addEventListener('scroll', compute, true);
        return () => {
            window.removeEventListener('resize', compute);
            window.removeEventListener('scroll', compute, true);
        };
    }, [aoiOpen]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(4);
    const PAGE_SIZE_OPTIONS = [4, 10, 20, 50] as const;

    /** 필터 칩에 표시할 facet count — MOCK_SCENES 기준으로 한 번 집계. */
    const facetCounts = useMemo(() => {
        const m: Record<string, number> = {};
        for (const s of MOCK_SCENES) {
            m[`mission:${s.mission}`] = (m[`mission:${s.mission}`] ?? 0) + 1;
            m[`product:${s.product}`] = (m[`product:${s.product}`] ?? 0) + 1;
            if (s.pol) m[`pol:${s.pol}`] = (m[`pol:${s.pol}`] ?? 0) + 1;
        }
        return m;
    }, []);

    const filtered = useMemo(() => {
        // MOCK_SCENES 에 S1A/S1C/S2A/S2B 가 모두 들어있으며, sceneMatches 가 platform 별로
        // 분기 처리한다. Umbra/Capella/KOMPSAT 은 mock 데이터 없어 자연스럽게 빈 결과.
        return MOCK_SCENES.filter((s) => {
            if (
                query &&
                !s.id.toLowerCase().includes(query.toLowerCase()) &&
                !s.region.toLowerCase().includes(query.toLowerCase())
            )
                return false;
            return sceneMatches(s, appliedFilters, platform, s2Filters);
        });
    }, [query, appliedFilters, platform, s2Filters]);

    /** 필터/검색어/페이지 크기 변경 시 1페이지로 리셋. */
    useEffect(() => {
        setPage(1);
    }, [appliedFilters, query, pageSize]);

    /**
     * AOI 가 그려져 있고 한 번 검색된 상태에서 사이드바 검색 조건(날짜·미션·제품·편광·Pass)이 바뀌면
     * 디바운스 후 자동으로 재검색. 초기 마운트나 hasSearched 가 토글된 직후에는 발동하지 않도록
     * skip 플래그로 제어한다. NAS 보유만/CDSE 강제 갱신 토글은 자동 재검색 트리거에서 제외.
     */
    const skipAutoSearchRef = useRef(true);
    useEffect(() => {
        if (skipAutoSearchRef.current) {
            skipAutoSearchRef.current = false;
            return;
        }
        if (!aoi || !hasSearched) return;
        const t = window.setTimeout(() => {
            executeSearch(filters);
        }, 300);
        return () => window.clearTimeout(t);
        // executeSearch / aoi / hasSearched 는 의존성에서 제외 — 마지막으로 설정된 시점의 값을
        // 클로저로 사용하면 충분하며, AOI 변경은 onAoiChange 에서 별도로 재검색을 트리거.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        filters.startDate,
        filters.endDate,
        filters.s1a,
        filters.s1c,
        filters.productMode,
        filters.grd,
        filters.ocn,
        filters.raw,
        filters.pol,
        filters.passA,
        filters.passD,
    ]);

    const aoiBounds = useMemo(() => {
        if (!aoi || aoi.length < 3) return null;
        let minLon = Infinity;
        let maxLon = -Infinity;
        let minLat = Infinity;
        let maxLat = -Infinity;
        for (const [lon, lat] of aoi) {
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        }
        return { nwLat: maxLat, nwLon: minLon, seLat: minLat, seLon: maxLon };
    }, [aoi]);

    useEffect(() => {
        if (!aoiBounds) return;
        setNwInput({ lat: aoiBounds.nwLat.toFixed(4), lon: aoiBounds.nwLon.toFixed(4) });
        setSeInput({ lat: aoiBounds.seLat.toFixed(4), lon: aoiBounds.seLon.toFixed(4) });
        setAoiErrors((prev) => (prev.size === 0 ? prev : new Set()));
    }, [aoiBounds]);

    useEffect(() => {
        if (activeTool !== 'bbox') return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setActiveTool(undefined);
                setPendingSearch(false);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [activeTool]);

    const handleDrawEnd = (
        _tool: MapTool,
        geom: { type: string; coordinates: unknown },
    ) => {
        if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
            const ring = (geom.coordinates as number[][][])[0];
            if (ring && ring.length >= 3) {
                const coords = ring.map(([lon, lat]) => [lon, lat] as [number, number]);
                setAoi(coords);
                toast('AOI 적용됨', { tone: 'success' });
                if (pendingSearch) {
                    setPendingSearch(false);
                    executeSearch(filters);
                }
            }
        }
        setActiveTool(undefined);
    };

    const applyManualBbox = () => {
        const nlat = parseFloat(nwInput.lat);
        const nlon = parseFloat(nwInput.lon);
        const slat = parseFloat(seInput.lat);
        const slon = parseFloat(seInput.lon);
        const errs = new Set<AoiField>();
        const validLat = (v: string, n: number) =>
            v.trim() !== '' && Number.isFinite(n) && n >= -90 && n <= 90;
        const validLon = (v: string, n: number) =>
            v.trim() !== '' && Number.isFinite(n) && n >= -180 && n <= 180;
        if (!validLat(nwInput.lat, nlat)) errs.add('nwLat');
        if (!validLon(nwInput.lon, nlon)) errs.add('nwLon');
        if (!validLat(seInput.lat, slat)) errs.add('seLat');
        if (!validLon(seInput.lon, slon)) errs.add('seLon');
        if (errs.size === 0) {
            // semantic checks: NW must be north of SE, and west of SE
            if (!(nlat > slat)) {
                errs.add('nwLat');
                errs.add('seLat');
            }
            if (!(slon > nlon)) {
                errs.add('nwLon');
                errs.add('seLon');
            }
        }
        if (errs.size > 0) {
            setAoiErrors(errs);
            toast('표시된 입력값을 확인해주세요', { tone: 'warning' });
            return;
        }
        setAoiErrors(new Set());
        setAoi([
            [nlon, nlat],
            [slon, nlat],
            [slon, slat],
            [nlon, slat],
            [nlon, nlat],
        ]);
        setAoiOpen(false);
        toast('AOI 적용됨', { tone: 'success' });
    };

    const clearAllAoiErrors = () => {
        setAoiErrors((prev) => (prev.size === 0 ? prev : new Set()));
    };
    const aoiInputStyle = (err: boolean) => ({
        width: '100%',
        height: 34,
        padding: '0 10px',
        fontSize: 12.5,
        borderRadius: 4,
        ...(err
            ? {
                  borderColor: 'var(--danger)',
                  background: 'color-mix(in srgb, var(--danger) 8%, var(--bg-3))',
              }
            : {}),
    });

    const clearAoi = () => {
        setAoi(null);
        setNwInput({ lat: '', lon: '' });
        setSeInput({ lat: '', lon: '' });
        setAoiErrors(new Set());
        toast('AOI 해제됨');
    };

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = useMemo(
        () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
        [filtered, safePage, pageSize],
    );
    const pageRange = useMemo(() => getPageRange(safePage, totalPages), [safePage, totalPages]);

    const footprints = useMemo<MapFootprint[]>(() => {
        return filtered
            .filter((s) => s.footprint && s.footprint.length >= 3)
            .map((s) => ({
                id: s.id,
                coords: s.footprint!,
                kind: s.have ? 'have' : 'need',
                label: `${s.mission} ${s.date.slice(0, 10)}`,
                active: selectedSceneId === s.id,
                onClick: () => {
                    setSelectedSceneId(s.id);
                    setSceneModal(s);
                },
            }));
    }, [filtered, selectedSceneId]);

    const allChecked = filtered.length > 0 && filtered.every((s) => checked.has(s.id));
    const toggleAll = () => {
        if (allChecked) {
            setChecked((prev) => {
                const n = new Set(prev);
                filtered.forEach((s) => n.delete(s.id));
                return n;
            });
        } else {
            setChecked((prev) => {
                const n = new Set(prev);
                filtered.forEach((s) => n.add(s.id));
                return n;
            });
        }
    };
    const toggleOne = (id: string) =>
        setChecked((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });

    const handleAdd = (s: HifiScene) => {
        const already = inCart(s.id);
        addToCart(s);
        toast(already ? '이미 장바구니에 있습니다' : `${s.id.slice(0, 32)}… 담음`, {
            tone: already ? 'warning' : 'success',
        });
    };
    const handleAddChecked = () => {
        const toAdd = filtered.filter((s) => checked.has(s.id));
        if (toAdd.length === 0) {
            toast('선택된 scene이 없습니다', { tone: 'warning' });
            return;
        }
        addManyToCart(toAdd);
        toast(`${toAdd.length}개 scene 담음`, { tone: 'success', title: '장바구니 추가' });
        setChecked(new Set());
    };
    const handleAddAll = () => {
        addManyToCart(filtered);
        toast(`${filtered.length}개 scene 담음`, { tone: 'success' });
    };
    const resetFilters = () => {
        const def = buildDefaultFilters();
        setFilters(def);
        setAppliedFilters(def);
        setQuery('');
        setChecked(new Set());
        setHasSearched(false);
        toast('필터 초기화됨');
    };
    const executeSearch = (draft: Filters, opts?: { refit?: boolean }) => {
        const refit = opts?.refit ?? true;
        setIsSearching(true);
        // 검색 요청 시뮬레이션 — 800ms 후 결과 적용 + 풋프린트에 맞춰 줌.
        // refit=false 인 경우(예: AOI 라이브러리 적용 직후) 직전 AOI 줌을 유지한다.
        window.setTimeout(() => {
            setAppliedFilters(draft);
            setHasSearched(true);
            if (refit) setFitKey(`fit-${Date.now()}`);
            setIsSearching(false);
            const next = MOCK_SCENES.filter((s) => sceneMatches(s, draft, platform, s2Filters));
            toast(`${next.length}개 scene 검색 결과`, { tone: 'success' });
        }, 800);
    };
    const runSearch = () => {
        if (isSearching) return;
        if (!aoi) {
            // AOI 미설정 → 사각형 그리기 모드를 켜고 그린 뒤 자동 검색.
            setPendingSearch(true);
            setActiveTool('bbox');
            toast('지도에서 사각형을 그려 검색 영역을 지정하세요');
            return;
        }
        executeSearch(filters);
    };

    const totalGb = filtered.reduce((a, s) => a + parseFloat(s.size), 0);

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <div className="split" style={{ flex: 1 }}>
                {/* LEFT filter panel */}
                <aside className="split__side split__side--left" style={{ width: 280 }}>
                    <div className="col gap-4" style={{ padding: 16, overflow: 'auto', flex: 1, minHeight: 0 }}>
                        <div>
                            <label className="field-label" style={{ marginBottom: 4 }}>
                                위성 플랫폼
                            </label>
                            <select
                                className="input"
                                aria-label="위성 플랫폼 선택"
                                style={{ width: '100%', height: 36, padding: '0 10px', fontSize: 13 }}
                                value={platform}
                                onChange={(e) => {
                                    const next = e.target.value as Platform;
                                    setPlatform(next);
                                    const def = PLATFORMS.find((p) => p.value === next);
                                    if (def && !def.ready) {
                                        toast(`${def.label} — ${def.note ?? '준비 중'}`, { tone: 'warning' });
                                    }
                                }}
                            >
                                {PLATFORMS.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                        {p.ready ? '' : ' · 준비중'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <FilterDivider />

                        <div>
                            <label className="field-label" style={{ marginBottom: 4 }}>
                                AOI (관심 영역)
                            </label>
                            <button
                                ref={aoiTriggerRef}
                                type="button"
                                onClick={() => setAoiOpen((v) => !v)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'var(--bg-2)',
                                    border: `1px solid ${aoiOpen ? 'var(--accent-border)' : 'var(--border-default)'}`,
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    color: 'var(--text-primary)',
                                }}
                            >
                                <Icon name="square" size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
                                <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                                    {aoi && aoiBounds ? (
                                        <>
                                            <span className="mono tabular" style={{ fontSize: 11 }}>
                                                NW {aoiBounds.nwLat.toFixed(3)}, {aoiBounds.nwLon.toFixed(3)}
                                            </span>
                                            <span className="mono tabular" style={{ fontSize: 11 }}>
                                                SE {aoiBounds.seLat.toFixed(3)}, {aoiBounds.seLon.toFixed(3)}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="faint" style={{ fontSize: 12 }}>
                                            클릭해서 AOI 설정
                                        </span>
                                    )}
                                </div>
                                <Icon
                                    name="chevronDown"
                                    size={12}
                                    style={{
                                        opacity: 0.6,
                                        transition: 'transform 120ms',
                                        transform: aoiOpen ? 'rotate(180deg)' : undefined,
                                        flexShrink: 0,
                                    }}
                                />
                            </button>
                        </div>

                        <FilterDivider />

                        <div>
                            <label className="field-label">날짜 범위</label>
                            <div style={{ marginTop: 2 }}>
                                <DateRangePicker
                                    start={filters.startDate}
                                    end={filters.endDate}
                                    maxDate={new Date()}
                                    onChange={(s, e) =>
                                        setFilters((f) => ({ ...f, startDate: s, endDate: e, datePreset: '' }))
                                    }
                                />
                            </div>
                            <div className="row gap-1" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                                {(['1주', '1개월', '3개월', '1년'] as const).map((t) => (
                                    <span
                                        key={t}
                                        className={`chip${filters.datePreset === t ? ' chip--active' : ''}`}
                                        style={{ height: 22, fontSize: 11 }}
                                        onClick={() => {
                                            const [s, e] = presetRange(t);
                                            setFilters((f) => ({ ...f, startDate: s, endDate: e, datePreset: t }));
                                        }}
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <FilterDivider />

                        {platform === 'S1' ? (
                            <>
                        <div>
                            <label className="field-label">미션</label>
                            <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                                <span
                                    className={`chip${filters.s1a ? ' chip--active' : ''}`}
                                    onClick={() => setFilters((f) => ({ ...f, s1a: !f.s1a }))}
                                >
                                    Sentinel-1A
                                </span>
                                <span
                                    className={`chip${filters.s1c ? ' chip--active' : ''}`}
                                    onClick={() => setFilters((f) => ({ ...f, s1c: !f.s1c }))}
                                >
                                    Sentinel-1C
                                </span>
                            </div>
                        </div>

                        <FilterDivider />

                        <div>
                            <label className="field-label">제품 타입</label>
                            <div className="segmented" style={{ marginTop: 2, display: 'flex', width: '100%' }}>
                                <button
                                    type="button"
                                    className={filters.productMode === 'slc' ? 'active' : ''}
                                    style={{ flex: 1 }}
                                    onClick={() => setFilters((f) => ({ ...f, productMode: 'slc' }))}
                                >
                                    SLC
                                </button>
                                <button
                                    type="button"
                                    className={filters.productMode === 'others' ? 'active' : ''}
                                    style={{ flex: 1 }}
                                    onClick={() => setFilters((f) => ({ ...f, productMode: 'others' }))}
                                >
                                    GRD / OCN / RAW
                                </button>
                            </div>
                            {filters.productMode === 'slc' ? (
                                <div
                                    className="faint"
                                    style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.5 }}
                                >
                                    Single Look Complex — 위상 정보 보존, InSAR/PSInSAR 분석에 사용
                                </div>
                            ) : (
                                <div className="col gap-2" style={{ marginTop: 8 }}>
                                    {(
                                        [
                                            ['grd', 'GRD', 'Ground Range Detected — 진폭 영상'],
                                            ['ocn', 'OCN', 'Ocean — 해양 풍속·파랑'],
                                            ['raw', 'RAW', 'Raw — 원시 신호'],
                                        ] as const
                                    ).map(([k, label, desc]) => (
                                        <label
                                            key={k}
                                            className="row gap-2"
                                            style={{ cursor: 'pointer', alignItems: 'flex-start' }}
                                        >
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                style={{ marginTop: 2, flexShrink: 0 }}
                                                checked={filters[k]}
                                                onChange={(e) =>
                                                    setFilters((f) => ({ ...f, [k]: e.target.checked }))
                                                }
                                            />
                                            <div className="col" style={{ gap: 1, minWidth: 0 }}>
                                                <span style={{ fontWeight: 500, fontSize: 12.5 }}>
                                                    {label}
                                                </span>
                                                <span
                                                    className="faint"
                                                    style={{ fontSize: 10.5, lineHeight: 1.35 }}
                                                >
                                                    {desc}
                                                </span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <FilterDivider />

                        <div>
                            <label className="field-label">편광 (다중 선택)</label>
                            <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                                {['VV', 'VH', 'HH', 'HV', 'VV+VH'].map((p) => (
                                    <span
                                        key={p}
                                        className={`chip${filters.pol.includes(p) ? ' chip--active' : ''}`}
                                        onClick={() =>
                                            setFilters((f) => ({
                                                ...f,
                                                pol: f.pol.includes(p)
                                                    ? f.pol.filter((x) => x !== p)
                                                    : [...f.pol, p],
                                            }))
                                        }
                                    >
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <FilterDivider />

                        <div>
                            <label className="field-label">Pass 방향 (다중 선택)</label>
                            <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                                <span
                                    className={`chip${filters.passA ? ' chip--active' : ''}`}
                                    onClick={() => setFilters((f) => ({ ...f, passA: !f.passA }))}
                                >
                                    Ascending
                                </span>
                                <span
                                    className={`chip${filters.passD ? ' chip--active' : ''}`}
                                    onClick={() => setFilters((f) => ({ ...f, passD: !f.passD }))}
                                >
                                    Descending
                                </span>
                            </div>
                        </div>
                            </>
                        ) : platform === 'S2' ? (
                            <S2FilterPanel filters={s2Filters} setFilters={setS2Filters} />
                        ) : (
                            <ComingSoonPanel
                                platform={PLATFORMS.find((p) => p.value === platform)!}
                            />
                        )}

                    </div>
                    <div
                        className="col gap-2"
                        style={{
                            flex: '0 0 auto',
                            padding: 16,
                            borderTop: '1px solid var(--border-subtle)',
                            background: 'var(--bg-1)',
                        }}
                    >
                        <label className="row gap-2" style={{ cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                className="checkbox"
                                checked={filters.haveOnly}
                                onChange={(e) => setFilters((f) => ({ ...f, haveOnly: e.target.checked }))}
                            />
                            <span style={{ fontSize: 12.5 }}>NAS 보유만 표시</span>
                            <InfoTip text="이미 NAS에 다운로드되어 즉시 사용 가능한 scene만 보여줍니다. 추가 다운로드 없이 바로 분석할 수 있습니다." />
                            <span className="badge badge--success" style={{ marginLeft: 'auto' }}>
                                빠름
                            </span>
                        </label>
                        <label className="row gap-2" style={{ cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                className="checkbox"
                                checked={filters.esaRefresh}
                                onChange={(e) => setFilters((f) => ({ ...f, esaRefresh: e.target.checked }))}
                            />
                            <span style={{ fontSize: 12.5 }}>CDSE 카탈로그 강제 갱신</span>
                            <InfoTip text="로컬 캐시 대신 CDSE(Copernicus Data Space Ecosystem) 원본 카탈로그를 다시 조회합니다. 최신 scene을 보장하지만 검색이 느려질 수 있습니다." />
                        </label>
                        <div className="row gap-2" style={{ marginTop: 4 }}>
                        <button
                            type="button"
                            className="btn btn--primary"
                            style={{ flex: 1 }}
                            onClick={runSearch}
                            disabled={isSearching}
                        >
                            {isSearching ? (
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
                                    검색 중…
                                </>
                            ) : activeTool === 'bbox' ? (
                                <>
                                    <Icon name="square" size={13} /> AOI 그리는 중…
                                </>
                            ) : (
                                <>
                                    <Icon name="search" size={13} /> 검색
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            className="btn btn--ghost btn--icon btn--sm"
                            data-tooltip="필터 초기화"
                            aria-label="필터 초기화"
                            onClick={resetFilters}
                        >
                            <Icon name="refresh" size={13} />
                        </button>
                        <button
                            type="button"
                            className="btn btn--ghost btn--icon btn--sm"
                            data-tooltip="CDSE 카탈로그 동기화"
                            aria-label="CDSE 카탈로그 동기화"
                            onClick={() => toast('CDSE 카탈로그 동기화 중…', { tone: 'success' })}
                        >
                            <Icon name="satellite" size={13} />
                        </button>
                        </div>
                    </div>
                </aside>

                {/* CENTER map + list — cart is now accessed via the top-nav icon (opens right overlay) */}
                <div className="split__main">
                    <div
                        style={{
                            flex: 1,
                            minHeight: 200,
                            transition: 'min-height 260ms ease',
                            position: 'relative',
                            isolation: 'isolate',
                        }}
                    >
                        <MapCanvas
                            center={[129.37, 36.02]}
                            zoom={8}
                            // preview 중이면 그려진 AOI 대신 미리보기를 표시 — 호버를 떼면 원래 AOI 로 복귀.
                            footprints={hasSearched && !previewAoi ? footprints : []}
                            aoi={previewAoi ? aoiToRing(previewAoi) : aoi}
                            activeTool={activeTool}
                            onDrawEnd={handleDrawEnd}
                            onAoiChange={(coords) => {
                                // 미리보기 중에는 사용자 편집을 무시 (preview 가 끝난 뒤 본 AOI 로 복귀하도록).
                                if (previewAoi) return;
                                setAoi(coords);
                                if (hasSearched && !isSearching) {
                                    executeSearch(appliedFilters);
                                }
                            }}
                            fitKey={fitKey}
                        >
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
                                    지도에서 드래그해 사각형 AOI를 그리세요 · ESC 취소
                                </div>
                            ) : null}
                        </MapCanvas>
                        {/* 항상 마운트해서 opacity/transform 으로 페이드인/아웃. */}
                        <div
                            aria-live="polite"
                            aria-hidden={!isSearching}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(15, 18, 22, 0.45)',
                                backdropFilter: isSearching ? 'blur(2px)' : 'blur(0px)',
                                zIndex: 10,
                                opacity: isSearching ? 1 : 0,
                                pointerEvents: isSearching ? 'all' : 'none',
                                transition: 'opacity 220ms ease, backdrop-filter 220ms ease',
                            }}
                        >
                            <div
                                className="row gap-2"
                                style={{
                                    background: 'var(--bg-2)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: 8,
                                    padding: '12px 18px',
                                    boxShadow: 'var(--shadow-md)',
                                    alignItems: 'center',
                                    transform: isSearching ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(4px)',
                                    opacity: isSearching ? 1 : 0,
                                    transition:
                                        'transform 240ms cubic-bezier(0.2, 0.7, 0.3, 1), opacity 220ms ease',
                                }}
                            >
                                <span
                                    aria-hidden
                                    style={{
                                        display: 'inline-block',
                                        width: 16,
                                        height: 16,
                                        borderRadius: '50%',
                                        border: '2px solid var(--accent)',
                                        borderTopColor: 'transparent',
                                        animation: 'spin 0.8s linear infinite',
                                    }}
                                />
                                <span style={{ fontSize: 13 }}>scene 검색 중…</span>
                            </div>
                        </div>
                    </div>

                    <div
                        className="col"
                        style={{
                            flex: '0 0 auto',
                            minHeight: 0,
                            borderTop: '1px solid var(--border-subtle)',
                            background: 'var(--bg-2)',
                        }}
                    >
                        <div
                            className="results-header between"
                            role="button"
                            aria-expanded={resultsOpen}
                            aria-label={resultsOpen ? '결과 접기' : '결과 펼치기'}
                            tabIndex={0}
                            onClick={() => setResultsOpen((v) => !v)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setResultsOpen((v) => !v);
                                }
                            }}
                            data-open={resultsOpen}
                        >
                            <div className="row gap-2" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
                                <Icon
                                    name="chevronDown"
                                    size={13}
                                    style={{
                                        transition: 'transform 200ms ease',
                                        transform: resultsOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                        opacity: 0.75,
                                    }}
                                />
                                {/* 결과/타임라인 탭 — 행 클릭으로 collapse 되지 않도록 stopPropagation. */}
                                <div
                                    role="tablist"
                                    aria-label="결과 패널 탭"
                                    className="row"
                                    style={{ gap: 0, alignItems: 'center' }}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                >
                                    {(
                                        [
                                            ['list', '결과'],
                                            ['timeline', '타임라인'],
                                        ] as const
                                    ).map(([key, label]) => {
                                        const active = resultsTab === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                role="tab"
                                                aria-selected={active}
                                                className="results-tab"
                                                data-active={active}
                                                onClick={() => {
                                                    setResultsTab(key);
                                                    setResultsOpen(true);
                                                }}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {resultsTab === 'timeline' ? (
                                    <span className="faint" style={{ fontSize: 12 }}>
                                        핸들을 드래그해 검색 기간을 조정하세요
                                    </span>
                                ) : null}
                                {resultsTab === 'list' && checked.size > 0 ? (
                                    <>
                                        <span className="faint">·</span>
                                        <span className="badge badge--accent">{checked.size} 선택됨</span>
                                        <button
                                            type="button"
                                            className="btn btn--ghost btn--sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setChecked(new Set());
                                                setResultsOpen(true);
                                            }}
                                        >
                                            선택 해제
                                        </button>
                                    </>
                                ) : null}
                            </div>
                            {/* 검색/담기 컨트롤 — 결과 탭에서만 노출. 패널이 닫혀 있어도 항상 보이며, 클릭 시 자기 동작 + 패널 오픈. */}
                            {resultsTab === 'list' ? (
                                <div
                                    className="row gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                >
                                    <input
                                        className="input input--search"
                                        placeholder="scene ID 검색…"
                                        style={{ width: 220, height: 28, fontSize: 12 }}
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onFocus={() => setResultsOpen(true)}
                                    />
                                    {checked.size > 0 ? (
                                        <button
                                            type="button"
                                            className="btn btn--primary btn--sm"
                                            onClick={() => {
                                                handleAddChecked();
                                                setResultsOpen(true);
                                            }}
                                        >
                                            <Icon name="cart" size={12} /> 선택한 {checked.size}개 담기
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn btn--sm"
                                            onClick={() => {
                                                handleAddAll();
                                                setResultsOpen(true);
                                            }}
                                        >
                                            <Icon name="cart" size={12} /> 전체 담기 ({filtered.length})
                                        </button>
                                    )}
                                </div>
                            ) : null}
                        </div>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateRows: resultsOpen ? '1fr' : '0fr',
                                transition: 'grid-template-rows 260ms ease',
                            }}
                            aria-hidden={!resultsOpen}
                        >
                            <div
                                style={{
                                    minHeight: 0,
                                    overflow: 'hidden',
                                    // list 탭은 카드/필터를 위해 패딩, timeline 탭은 풀블리드 SVG 라 0.
                                    padding: resultsTab === 'list' ? '8px 12px 12px' : 0,
                                }}
                            >
                        {resultsTab === 'list' ? (
                            <>
                        {filtered.length > 0 ? (
                            <CompactStatsStrip scenes={filtered} totalGb={totalGb} />
                        ) : null}
                        <ResultsFilter
                            filters={appliedFilters}
                            setFilters={setAppliedFilters}
                            facetCounts={facetCounts}
                        />
                        <div
                            className="card"
                            style={{ maxHeight: 320, overflow: 'auto', display: 'flex', flexDirection: 'column' }}
                        >
                            {filtered.length === 0 ? (
                                <div className="empty" style={{ padding: 60 }}>
                                    <div className="empty__icon">🔍</div>
                                    {platform === 'S1' ? (
                                        <>
                                            <div>일치하는 scene이 없습니다</div>
                                            <button
                                                type="button"
                                                className="btn btn--sm"
                                                style={{ marginTop: 12 }}
                                                onClick={resetFilters}
                                            >
                                                필터 초기화
                                            </button>
                                        </>
                                    ) : platform === 'S2' ? (
                                        <>
                                            <div>Sentinel-2 카탈로그 연동 준비 중</div>
                                            <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
                                                필터 UI 만 미리보기 — 실제 검색 결과는 아직 표시되지 않습니다.
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                {PLATFORMS.find((p) => p.value === platform)?.label} — 연동 준비 중
                                            </div>
                                            <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
                                                Sentinel-1 을 선택하면 검색 결과를 볼 수 있습니다.
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th className="checkbox-col">
                                                <input
                                                    type="checkbox"
                                                    className="checkbox"
                                                    checked={allChecked}
                                                    onChange={toggleAll}
                                                />
                                            </th>
                                            <th>Scene</th>
                                            <th>미션</th>
                                            <th className="num">Track</th>
                                            <th className="num">Orbit</th>
                                            <th>제품</th>
                                            <th>편광</th>
                                            <th>취득 시각</th>
                                            <th className="num">용량</th>
                                            <th>상태</th>
                                            <th style={{ width: 120 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginated.map((s) => (
                                            <tr
                                                key={s.id}
                                                className={selectedSceneId === s.id ? 'is-selected' : ''}
                                                onClick={() => {
                                                    setSelectedSceneId(s.id);
                                                    setSceneModal(s);
                                                }}
                                            >
                                                <td className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox"
                                                        checked={checked.has(s.id)}
                                                        onChange={() => toggleOne(s.id)}
                                                    />
                                                </td>
                                                <td>
                                                    <div className="row gap-3">
                                                        <Quicklook sceneId={s.id} size={42} />
                                                        <div
                                                            className="mono"
                                                            style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}
                                                        >
                                                            {s.id}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge badge--solid" style={{ fontSize: 10 }}>
                                                        {s.mission}
                                                    </span>
                                                </td>
                                                <td className="num mono tabular" style={{ fontSize: 12 }}>
                                                    {relativeOrbit(s.orbit, s.mission) ?? '—'}
                                                </td>
                                                <td className="num mono tabular" style={{ fontSize: 12 }}>
                                                    {s.orbit ?? '—'}
                                                </td>
                                                <td>
                                                    <span className="badge badge--neutral">{s.product}</span>
                                                </td>
                                                <td className="mono" style={{ fontSize: 12 }}>
                                                    {s.pol}
                                                </td>
                                                <td
                                                    className="mono tabular"
                                                    style={{ fontSize: 12, color: 'var(--text-secondary)' }}
                                                >
                                                    {s.date}
                                                </td>
                                                <td className="num tabular mono" style={{ fontSize: 12 }}>
                                                    {s.size}
                                                </td>
                                                <td>
                                                    {s.have ? (
                                                        <span className="status status--done">NAS 보유</span>
                                                    ) : (
                                                        <span className="status status--pending">받기 필요</span>
                                                    )}
                                                </td>
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    <div className="row gap-1">
                                                        <button
                                                            type="button"
                                                            className="btn btn--ghost btn--icon btn--sm"
                                                            data-tooltip="상세"
                                                            onClick={() => setSceneModal(s)}
                                                        >
                                                            <Icon name="chevronRight" size={13} />
                                                        </button>
                                                        {inCart(s.id) ? (
                                                            <button
                                                                type="button"
                                                                className="btn btn--sm"
                                                                disabled
                                                            >
                                                                <Icon name="check" size={12} /> 담김
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="btn btn--outline-accent btn--sm"
                                                                onClick={() => handleAdd(s)}
                                                            >
                                                                담기
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            <div
                                className="row"
                                style={{
                                    padding: '8px 14px',
                                    borderTop: '1px solid var(--border-subtle)',
                                    fontSize: 12,
                                    color: 'var(--text-tertiary)',
                                    gap: 14,
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                }}
                            >
                                <span className="tabular" style={{ whiteSpace: 'nowrap' }}>
                                    {filtered.length === 0
                                        ? '0'
                                        : `${(safePage - 1) * pageSize + 1}–${Math.min(
                                              safePage * pageSize,
                                              filtered.length,
                                          )}`}{' '}
                                    / {filtered.length}
                                </span>
                                <div className="row gap-1" style={{ alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        className="btn btn--ghost btn--icon btn--sm"
                                        aria-label="이전 페이지"
                                        disabled={safePage <= 1}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    >
                                        <Icon
                                            name="chevronRight"
                                            size={13}
                                            style={{ transform: 'scaleX(-1)' }}
                                        />
                                    </button>
                                    {pageRange.map((p, i) =>
                                        p === '...' ? (
                                            <span
                                                key={`gap-${i}`}
                                                className="faint mono"
                                                style={{ padding: '0 4px' }}
                                            >
                                                …
                                            </span>
                                        ) : (
                                            <button
                                                key={p}
                                                type="button"
                                                className={`btn btn--sm${
                                                    p === safePage ? ' btn--primary' : ' btn--ghost'
                                                }`}
                                                style={{ minWidth: 28, padding: '0 8px' }}
                                                aria-current={p === safePage ? 'page' : undefined}
                                                onClick={() => setPage(p)}
                                            >
                                                {p}
                                            </button>
                                        ),
                                    )}
                                    <button
                                        type="button"
                                        className="btn btn--ghost btn--icon btn--sm"
                                        aria-label="다음 페이지"
                                        disabled={safePage >= totalPages}
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    >
                                        <Icon name="chevronRight" size={13} />
                                    </button>
                                </div>
                                <label
                                    className="row gap-2"
                                    style={{ alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}
                                >
                                    <span className="faint">페이지당</span>
                                    <select
                                        className="input"
                                        style={{ height: 26, padding: '0 6px', fontSize: 12, width: 'auto' }}
                                        value={pageSize}
                                        onChange={(e) => setPageSize(Number(e.target.value))}
                                        aria-label="페이지당 행 수"
                                    >
                                        {PAGE_SIZE_OPTIONS.map((n) => (
                                            <option key={n} value={n}>
                                                {n}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </div>
                            </>
                        ) : (
                            <RequestTimelinePanel
                                showHeader={false}
                                rangeStart={filters.startDate}
                                rangeEnd={filters.endDate}
                                onRangeChange={(s, e) =>
                                    setFilters((f) => ({
                                        ...f,
                                        startDate: s,
                                        endDate: e,
                                        datePreset: '',
                                    }))
                                }
                            />
                        )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {sceneModal ? (
                <SceneDetailModal
                    scene={sceneModal}
                    inCart={inCart(sceneModal.id)}
                    onClose={() => setSceneModal(null)}
                    onAddToCart={(s) => {
                        addToCart(s);
                        toast('장바구니에 담음', { tone: 'success' });
                    }}
                />
            ) : null}

            {aoiMounted && aoiOpen && aoiPopPos
                ? createPortal(
                      <div
                          ref={aoiPopRef}
                          role="dialog"
                          aria-label="AOI 영역 설정"
                          style={{
                              position: 'fixed',
                              top: aoiPopPos.top,
                              left: aoiPopPos.left,
                              width: 320,
                              padding: 14,
                              background: 'var(--bg-2)',
                              border: '1px solid var(--border-default)',
                              borderRadius: 8,
                              boxShadow: 'var(--shadow-lg)',
                              zIndex: 100,
                          }}
                          className="col gap-3"
                      >
                          <div className="between" style={{ alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>AOI 영역 설정</span>
                              <button
                                  type="button"
                                  className="btn btn--ghost btn--icon btn--sm"
                                  aria-label="닫기"
                                  onClick={() => setAoiOpen(false)}
                              >
                                  <Icon name="x" size={12} />
                              </button>
                          </div>
                          <div className="faint" style={{ fontSize: 11, lineHeight: 1.5 }}>
                              지도에서 사각형을 그리거나 좌상단(북서)·우하단(남동) 위경도를 직접 입력하세요.
                          </div>
                          <div
                              className="row gap-2"
                              style={{
                                  paddingBottom: 10,
                                  borderBottom: '1px solid var(--border-subtle)',
                              }}
                          >
                              <SaveAoiButton bounds={aoiBounds} />
                              <LoadAoiMenu
                                  // Hover: 미리보기 + 해당 AOI 로 지도 fly. 팝오버가 닫히면 원래 AOI 로 복귀.
                                  onHover={(a) => {
                                      setPreviewAoi((prev) => {
                                          if (a) {
                                              setFitKey(`preview-${a.id}-${Date.now()}`);
                                              return a;
                                          }
                                          // null — 팝오버가 닫혔다는 신호. 직전에 미리보기 중이었다면 원본 위치로 복귀.
                                          if (prev) setFitKey(`back-${Date.now()}`);
                                          return null;
                                      });
                                  }}
                                  onApply={(a) => {
                                      setAoi(aoiToRing(a));
                                      setPreviewAoi(null);
                                      setFitKey(`fit-aoi-${a.id}-${Date.now()}`);
                                      setAoiOpen(false);
                                      toast(`"${a.name}" 적용됨`, { tone: 'success' });
                                  }}
                              />
                          </div>
                          <div className="col gap-2">
                              <label className="field-label" style={{ margin: 0 }}>
                                  좌상단 (북서)
                              </label>
                              <div className="row gap-2">
                                  <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                                      <span className="faint" style={{ fontSize: 10.5 }}>위도 (°N)</span>
                                      <input
                                          className="input mono tabular"
                                          placeholder="예: 36.020"
                                          style={aoiInputStyle(aoiErrors.has('nwLat'))}
                                          value={nwInput.lat}
                                          onChange={(e) => {
                                              const v = e.target.value;
                                              setNwInput((s) => ({ ...s, lat: v }));
                                              clearAllAoiErrors();
                                          }}
                                      />
                                  </div>
                                  <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                                      <span className="faint" style={{ fontSize: 10.5 }}>경도 (°E)</span>
                                      <input
                                          className="input mono tabular"
                                          placeholder="예: 129.370"
                                          style={aoiInputStyle(aoiErrors.has('nwLon'))}
                                          value={nwInput.lon}
                                          onChange={(e) => {
                                              const v = e.target.value;
                                              setNwInput((s) => ({ ...s, lon: v }));
                                              clearAllAoiErrors();
                                          }}
                                      />
                                  </div>
                              </div>
                          </div>
                          <div className="col gap-2">
                              <label className="field-label" style={{ margin: 0 }}>
                                  우하단 (남동)
                              </label>
                              <div className="row gap-2">
                                  <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                                      <span className="faint" style={{ fontSize: 10.5 }}>위도 (°N)</span>
                                      <input
                                          className="input mono tabular"
                                          placeholder="예: 35.500"
                                          style={aoiInputStyle(aoiErrors.has('seLat'))}
                                          value={seInput.lat}
                                          onChange={(e) => {
                                              const v = e.target.value;
                                              setSeInput((s) => ({ ...s, lat: v }));
                                              clearAllAoiErrors();
                                          }}
                                      />
                                  </div>
                                  <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                                      <span className="faint" style={{ fontSize: 10.5 }}>경도 (°E)</span>
                                      <input
                                          className="input mono tabular"
                                          placeholder="예: 129.500"
                                          style={aoiInputStyle(aoiErrors.has('seLon'))}
                                          value={seInput.lon}
                                          onChange={(e) => {
                                              const v = e.target.value;
                                              setSeInput((s) => ({ ...s, lon: v }));
                                              clearAllAoiErrors();
                                          }}
                                      />
                                  </div>
                              </div>
                          </div>
                          {aoiErrors.size > 0 ? (
                              <div
                                  style={{
                                      fontSize: 11,
                                      color: 'var(--danger)',
                                      lineHeight: 1.4,
                                  }}
                              >
                                  붉게 표시된 입력란을 확인하세요. 좌상단 위도 &gt; 우하단 위도, 좌상단 경도 &lt; 우하단 경도여야 합니다.
                              </div>
                          ) : null}
                          <div className="row gap-2" style={{ marginTop: 4 }}>
                              <button
                                  type="button"
                                  className="btn btn--primary btn--sm"
                                  style={{ flex: 1 }}
                                  onClick={applyManualBbox}
                              >
                                  좌표로 AOI 적용
                              </button>
                              {aoi ? (
                                  <button
                                      type="button"
                                      className="btn btn--ghost btn--sm"
                                      onClick={() => {
                                          clearAoi();
                                          setAoiOpen(false);
                                      }}
                                  >
                                      AOI 해제
                                  </button>
                              ) : null}
                          </div>
                      </div>,
                      document.body,
                  )
                : null}
        </div>
    );
}

interface DetailProps {
    scene: HifiScene;
    onClose: () => void;
    onAddToCart: (s: HifiScene) => void;
    inCart: boolean;
}

function SceneDetailModal({ scene, onClose, onAddToCart, inCart }: DetailProps) {
    const toast = useToast();
    return (
        <Modal
            title="Scene 상세"
            sub={scene.region + ' · ' + scene.date}
            onClose={onClose}
            size="lg"
            footer={(close) => (
                <>
                    <button type="button" className="btn" onClick={close}>
                        닫기
                    </button>
                    {inCart ? (
                        <button type="button" className="btn" disabled>
                            <Icon name="check" size={13} /> 이미 담김
                        </button>
                    ) : scene.have ? (
                        <button
                            type="button"
                            className="btn btn--primary"
                            onClick={() => {
                                onAddToCart(scene);
                                close();
                            }}
                        >
                            <Icon name="download" size={13} /> 즉시 다운로드
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn--primary"
                            onClick={() => {
                                onAddToCart(scene);
                                close();
                            }}
                        >
                            <Icon name="cart" size={13} /> 장바구니 담기
                        </button>
                    )}
                </>
            )}
        >
            <div className="row gap-4" style={{ alignItems: 'flex-start' }}>
                <Quicklook sceneId={scene.id} size={200} />
                <div className="col gap-3" style={{ flex: 1, minWidth: 0 }}>
                    <div>
                        <div className="field-label">Scene ID</div>
                        <div
                            className="mono"
                            style={{ fontSize: 11.5, color: 'var(--text-primary)', wordBreak: 'break-all' }}
                        >
                            {scene.id}
                        </div>
                    </div>
                    <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
                        {[
                            ['미션', scene.mission],
                            ['모드', scene.mode ?? '—'],
                            ['제품', scene.product],
                            ['편광', scene.pol ?? '—'],
                            ['Orbit', String(scene.orbit ?? '—')],
                            ['용량', scene.size],
                        ].map(([k, v]) => (
                            <div key={k} className="col" style={{ gap: 2, minWidth: 80 }}>
                                <div className="field-label">{k}</div>
                                <div className="mono tabular" style={{ fontSize: 13 }}>
                                    {v}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="row gap-4">
                        <div className="col" style={{ gap: 2 }}>
                            <div className="field-label">상태</div>
                            {scene.have ? (
                                <span className="status status--done">NAS 보유 · 즉시 이용 가능</span>
                            ) : (
                                <span className="status status--pending">받기 필요 · 약 8분 소요</span>
                            )}
                        </div>
                    </div>
                    {scene.have ? (
                        <div
                            style={{
                                background: 'var(--bg-3)',
                                borderRadius: 8,
                                padding: 12,
                            }}
                        >
                            <div className="field-label">NAS 경로</div>
                            <div className="between" style={{ marginTop: 4 }}>
                                <span className="mono" style={{ fontSize: 11.5 }}>
                                    /nas/sar/{scene.mission}/2026/04/{scene.id.slice(0, 20)}.SAFE.zip
                                </span>
                                <button
                                    type="button"
                                    className="btn btn--ghost btn--sm"
                                    onClick={() => {
                                        navigator.clipboard?.writeText('/nas/sar/...');
                                        toast('경로를 복사했습니다');
                                    }}
                                >
                                    경로 복사
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </Modal>
    );
}

function CompactStatsStrip({ scenes, totalGb }: { scenes: HifiScene[]; totalGb: number }) {
    const total = scenes.length;
    const haveCount = scenes.filter((s) => s.have).length;
    const needCount = total - haveCount;
    const dates = scenes.map((s) => s.date.slice(0, 10)).sort();
    const dateRange = dates.length > 0 ? `${dates[0]} ~ ${dates[dates.length - 1]}` : '—';
    return (
        <div
            className="row"
            style={{
                marginBottom: 8,
                padding: '6px 12px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                flexWrap: 'wrap',
                gap: 14,
                alignItems: 'baseline',
                rowGap: 4,
            }}
        >
            <CompactStat label="결과" value={`${total}`} sub={`${totalGb.toFixed(1)} GB`} />
            <Sep />
            <CompactStat
                label="NAS 보유"
                value={`${haveCount}`}
                sub={`${pct(haveCount, total)}%`}
                tone="success"
            />
            <Sep />
            <CompactStat
                label="받기 필요"
                value={`${needCount}`}
                sub={`${pct(needCount, total)}%`}
                tone="warning"
            />
            <Sep />
            <CompactStat label="기간" value={dateRange} mono />
        </div>
    );
}

function Sep() {
    return (
        <span className="faint" style={{ fontSize: 12, opacity: 0.4 }}>
            |
        </span>
    );
}

/** 결과 패널의 quick-filter 행 — 미션/제품/편광별 카운트 칩. 사이드바 필터 상태와 동기화. */
function ResultsFilter({
    filters,
    setFilters,
    facetCounts,
}: {
    filters: Filters;
    setFilters: Dispatch<SetStateAction<Filters>>;
    facetCounts: Record<string, number>;
}) {
    return (
        <div
            className="row"
            style={{
                marginBottom: 8,
                padding: '6px 12px',
                background: 'var(--bg-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                flexWrap: 'wrap',
                gap: 10,
                alignItems: 'center',
                rowGap: 6,
            }}
        >
            <FilterGroup label="미션">
                <FilterChip
                    active={filters.s1a}
                    label="S1A"
                    n={facetCounts['mission:S1A'] ?? 0}
                    onClick={() => setFilters((f) => ({ ...f, s1a: !f.s1a }))}
                />
                <FilterChip
                    active={filters.s1c}
                    label="S1C"
                    n={facetCounts['mission:S1C'] ?? 0}
                    onClick={() => setFilters((f) => ({ ...f, s1c: !f.s1c }))}
                />
            </FilterGroup>
            <Sep />
            <FilterGroup label="제품">
                <FilterChip
                    active={filters.productMode === 'slc'}
                    label="SLC"
                    n={facetCounts['product:SLC'] ?? 0}
                    onClick={() => setFilters((f) => ({ ...f, productMode: 'slc' }))}
                />
                {(['grd', 'ocn', 'raw'] as const).map((k) => {
                    const upper = k.toUpperCase();
                    return (
                        <FilterChip
                            key={k}
                            active={filters.productMode === 'others' && filters[k]}
                            label={upper}
                            n={facetCounts[`product:${upper}`] ?? 0}
                            onClick={() =>
                                setFilters((f) =>
                                    f.productMode === 'others'
                                        ? { ...f, [k]: !f[k] }
                                        : {
                                              ...f,
                                              productMode: 'others',
                                              grd: false,
                                              ocn: false,
                                              raw: false,
                                              [k]: true,
                                          },
                                )
                            }
                        />
                    );
                })}
            </FilterGroup>
            <Sep />
            <FilterGroup label="편광">
                {['VV', 'VH', 'HH', 'HV', 'VV+VH'].map((p) => (
                    <FilterChip
                        key={p}
                        active={filters.pol.includes(p)}
                        label={p}
                        n={facetCounts[`pol:${p}`] ?? 0}
                        onClick={() =>
                            setFilters((f) => ({
                                ...f,
                                pol: f.pol.includes(p) ? f.pol.filter((x) => x !== p) : [...f.pol, p],
                            }))
                        }
                    />
                ))}
            </FilterGroup>
        </div>
    );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
    return (
        <span className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="faint" style={{ fontSize: 11 }}>
                {label}
            </span>
            {children}
        </span>
    );
}

function FilterChip({
    active,
    label,
    n,
    onClick,
}: {
    active: boolean;
    label: string;
    n: number;
    onClick: () => void;
}) {
    return (
        <span
            className={`chip${active ? ' chip--active' : ''}`}
            style={{ height: 22, fontSize: 11, opacity: n === 0 ? 0.5 : 1 }}
            onClick={onClick}
        >
            {label}
            <span className="mono tabular" style={{ marginLeft: 4, fontSize: 10.5, opacity: 0.7 }}>
                {n}
            </span>
        </span>
    );
}

function CompactStat({
    label,
    value,
    sub,
    tone,
    mono,
}: {
    label: string;
    value: string;
    sub?: string;
    tone?: 'success' | 'warning';
    mono?: boolean;
}) {
    const color = tone === 'success' ? 'var(--success)' : tone === 'warning' ? 'var(--warning)' : 'var(--text-primary)';
    return (
        <span className="row" style={{ gap: 6, alignItems: 'baseline' }}>
            <span className="faint" style={{ fontSize: 11 }}>
                {label}
            </span>
            <span
                className={mono ? 'mono tabular' : 'tabular'}
                style={{ fontSize: mono ? 12 : 14, fontWeight: 600, color }}
            >
                {value}
            </span>
            {sub ? (
                <span className="faint mono tabular" style={{ fontSize: 11 }}>
                    · {sub}
                </span>
            ) : null}
        </span>
    );
}

/** 페이지네이션 표시용 범위 — 7개 이하면 전부, 그 이상이면 1 … current-1 current current+1 … last 패턴. */
function getPageRange(current: number, total: number): Array<number | '...'> {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: Array<number | '...'> = [1];
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
}

/** Sentinel-1 절대 orbit → 상대 orbit(track). 1A/1C 모두 175 cycle, 미션별 offset 적용. */
function relativeOrbit(orbit: number | undefined, mission: string | undefined): number | null {
    if (!orbit) return null;
    const offset = mission === 'S1A' ? 73 : mission === 'S1C' ? 27 : 0;
    return ((orbit - offset) % 175 + 175) % 175 + 1;
}

function pct(n: number, total: number): number {
    if (!total) return 0;
    return Math.round((n / total) * 100);
}

/** Sentinel-2(광학) 전용 필터 — 처리 레벨, 구름 비율, 밴드 선택. */
function S2FilterPanel({
    filters,
    setFilters,
}: {
    filters: S2Filters;
    setFilters: Dispatch<SetStateAction<S2Filters>>;
}) {
    const BANDS: Array<{ key: string; label: string; desc: string }> = [
        { key: 'TCI', label: 'TCI (트루컬러)', desc: 'B04/B03/B02 합성 미리보기' },
        { key: 'B08', label: 'B08 (NIR)', desc: '근적외 · 식생 분석' },
        { key: 'B11', label: 'B11 (SWIR1)', desc: '단파적외 · 산불·습도' },
        { key: 'B12', label: 'B12 (SWIR2)', desc: '단파적외 · 광물 탐사' },
    ];
    return (
        <>
            <div>
                <label className="field-label">처리 레벨</label>
                <div className="segmented" style={{ marginTop: 2, display: 'flex', width: '100%' }}>
                    {(['L1C', 'L2A'] as const).map((lv) => (
                        <button
                            key={lv}
                            type="button"
                            className={filters.level === lv ? 'active' : ''}
                            style={{ flex: 1 }}
                            onClick={() => setFilters((f) => ({ ...f, level: lv }))}
                        >
                            {lv}
                        </button>
                    ))}
                </div>
                <div className="faint" style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.5 }}>
                    {filters.level === 'L1C'
                        ? 'Top-of-Atmosphere 반사율 (대기 보정 전)'
                        : 'Bottom-of-Atmosphere 반사율 + SCL 클래스맵 (Sen2Cor 처리)'}
                </div>
            </div>

            <FilterDivider />

            <div>
                <div className="between" style={{ alignItems: 'baseline' }}>
                    <label className="field-label" style={{ margin: 0 }}>
                        최대 구름 비율
                    </label>
                    <span className="mono tabular" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        ≤ {filters.cloudMax}%
                    </span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={filters.cloudMax}
                    onChange={(e) => setFilters((f) => ({ ...f, cloudMax: Number(e.target.value) }))}
                    style={{ width: '100%', marginTop: 6 }}
                    aria-label="최대 구름 비율"
                />
                <div className="row gap-1" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                    {[10, 20, 30, 50, 100].map((v) => (
                        <span
                            key={v}
                            className={`chip${filters.cloudMax === v ? ' chip--active' : ''}`}
                            style={{ height: 22, fontSize: 11 }}
                            onClick={() => setFilters((f) => ({ ...f, cloudMax: v }))}
                        >
                            {v}%
                        </span>
                    ))}
                </div>
            </div>

            <FilterDivider />

            <div>
                <label className="field-label">밴드 (다중 선택)</label>
                <div className="col gap-2" style={{ marginTop: 4 }}>
                    {BANDS.map((b) => {
                        const checked = filters.bands.includes(b.key);
                        return (
                            <label
                                key={b.key}
                                className="row gap-2"
                                style={{ cursor: 'pointer', alignItems: 'flex-start' }}
                            >
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    style={{ marginTop: 2, flexShrink: 0 }}
                                    checked={checked}
                                    onChange={() =>
                                        setFilters((f) => ({
                                            ...f,
                                            bands: checked
                                                ? f.bands.filter((x) => x !== b.key)
                                                : [...f.bands, b.key],
                                        }))
                                    }
                                />
                                <div className="col" style={{ gap: 1, minWidth: 0 }}>
                                    <span style={{ fontWeight: 500, fontSize: 12.5 }}>{b.label}</span>
                                    <span className="faint" style={{ fontSize: 10.5, lineHeight: 1.35 }}>
                                        {b.desc}
                                    </span>
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

/** 연동 준비 중인 위성용 안내 패널 — 필터 대신 placeholder + 외부 링크 안내. */
function ComingSoonPanel({ platform }: { platform: PlatformDef }) {
    return (
        <div
            className="col gap-2"
            style={{
                padding: 14,
                background: 'var(--bg-2)',
                border: '1px dashed var(--border-default)',
                borderRadius: 8,
                alignItems: 'center',
                textAlign: 'center',
            }}
        >
            <Icon name="satellite" size={20} style={{ opacity: 0.6 }} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>{platform.label}</div>
            <div className="faint" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                {platform.note ?? '연동 준비 중입니다.'}
                <br />
                연동되면 이 패널에서 검색·필터를 사용할 수 있습니다.
            </div>
            <span className="badge badge--warning" style={{ marginTop: 4 }}>
                준비 중
            </span>
        </div>
    );
}
