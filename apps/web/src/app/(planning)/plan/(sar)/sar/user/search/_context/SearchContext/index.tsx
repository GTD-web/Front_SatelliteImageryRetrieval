'use client';

/**
 * Scene 검색 통합 Context — query(SWR) + commands + UI 상태 조립
 *
 * - Service 주입 패턴으로 Plan(Mock) / Current(실제 API) 환경 분기.
 * - 검색 결과(scene 목록·facet)는 useState 로 들지 않고 query(SWR) 결과를 그대로 전달.
 * - 필터 입력 / 지도 그리기 / 선택 / 카트 UI / 모달 플래그 등 순수 UI 상태만 useState.
 * - 저장된 AOI(라이브러리)는 이 검색 도메인에 포함하지 않는다. 페이지 간 공유되는
 *   SavedAoisContext 가 담당하며, UI 패널이 그 훅/컴포넌트를 직접 사용한다(여기서는
 *   ?aoi= 진입 시 1회 조회만 한다).
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

import type { ISearchService } from '../../_services/search.service.interface';
import type { SearchUI } from '../../_mocks/search.ui-interface';
import {
    buildDefaultFilters,
    buildDefaultS2Filters,
    getPageRange,
    pct,
} from '../../_constants/search-filters';
import { PLATFORMS } from '../../_constants/search-platforms';
import { useSceneSearchQuery } from './queries/use-scene-search-query';
import { useCartCommands } from './commands/use-cart-commands';

type AoiField = 'nwLat' | 'nwLon' | 'seLat' | 'seLon';

interface SearchContextValue {
    // 데이터 (SWR)
    scenes: SearchUI.Scene[];
    facetCounts: Record<string, number>;
    isSearching: boolean;
    hasSearched: boolean;

    // 플랫폼 / 필터
    platform: SearchUI.Platform;
    setPlatform: (p: SearchUI.Platform) => void;
    filters: SearchUI.Filters;
    setFilters: React.Dispatch<React.SetStateAction<SearchUI.Filters>>;
    appliedFilters: SearchUI.Filters;
    setAppliedFilters: React.Dispatch<React.SetStateAction<SearchUI.Filters>>;
    s2Filters: SearchUI.S2Filters;
    setS2Filters: React.Dispatch<React.SetStateAction<SearchUI.S2Filters>>;
    query: string;
    setQuery: (q: string) => void;
    resetFilters: () => void;
    runSearch: () => void;

    // AOI (현재 그려진 검색 영역 — 라이브러리 저장과는 별개)
    aoi: Array<[number, number]> | null;
    aoiBounds: SearchUI.AoiBounds | null;
    previewAoi: SavedAoi | null;
    setPreviewAoi: React.Dispatch<React.SetStateAction<SavedAoi | null>>;
    activeTool: MapTool | undefined;
    fitKey: string;
    setFitKey: (k: string) => void;
    handleDrawEnd: (tool: MapTool, geom: DrawnGeometry) => void;
    onAoiChange: (coords: Array<[number, number]>) => void;
    startDrawAoi: () => void;
    clearAoi: () => void;
    applyManualBbox: () => void;
    applySavedAoi: (a: SavedAoi) => void;

    // AOI 좌표 입력
    nwInput: { lat: string; lon: string };
    setNwInput: React.Dispatch<React.SetStateAction<{ lat: string; lon: string }>>;
    seInput: { lat: string; lon: string };
    setSeInput: React.Dispatch<React.SetStateAction<{ lat: string; lon: string }>>;
    aoiErrors: Set<AoiField>;
    clearAllAoiErrors: () => void;

    // AOI 팝오버
    aoiOpen: boolean;
    setAoiOpen: React.Dispatch<React.SetStateAction<boolean>>;
    aoiTriggerRef: React.RefObject<HTMLButtonElement | null>;

    // 선택 / 모달
    selectedSceneId: string | null;
    setSelectedSceneId: (id: string | null) => void;
    sceneModal: SearchUI.Scene | null;
    openSceneModal: (s: SearchUI.Scene) => void;
    closeSceneModal: () => void;
    checked: Set<string>;
    toggleAll: () => void;
    toggleOne: (id: string) => void;
    clearChecked: () => void;
    allChecked: boolean;

    // 결과 패널
    resultsOpen: boolean;
    setResultsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    resultsTab: 'list' | 'timeline';
    setResultsTab: (t: 'list' | 'timeline') => void;

    // 페이지네이션
    page: number;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    pageSize: number;
    setPageSize: (n: number) => void;
    safePage: number;
    totalPages: number;
    paginated: SearchUI.Scene[];
    pageRange: Array<number | '...'>;

    // 지도 / 통계
    footprints: MapFootprint[];
    stats: {
        total: number;
        totalGb: number;
        haveCount: number;
        needCount: number;
        resultRange: string;
        havePct: number;
        needPct: number;
    };

    // 카트 commands
    inCart: (id: string) => boolean;
    씬을_담는다: (s: SearchUI.Scene) => void;
    씬을_담고_안내한다: (s: SearchUI.Scene) => void;
    선택한_씬을_담는다: () => void;
    전체_씬을_담는다: () => void;
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function SearchProvider({ children, uiService }: { children: ReactNode; uiService: ISearchService }) {
    const toast = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { getById: getSavedAoiById } = useSavedAois();
    const cart = useCartCommands();

    // ── 플랫폼 / 필터 (사이드바 입력 vs 적용된 조건) ───────────────────────────
    const [platform, setPlatform] = useState<SearchUI.Platform>('S1');
    const [filters, setFilters] = useState<SearchUI.Filters>(() => buildDefaultFilters());
    const [appliedFilters, setAppliedFilters] = useState<SearchUI.Filters>(() => buildDefaultFilters());
    const [s2Filters, setS2Filters] = useState<SearchUI.S2Filters>(() => buildDefaultS2Filters());
    const [query, setQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    // ── AOI / 지도 ─────────────────────────────────────────────────────────
    // 기본 AOI 없음 — 사용자가 직접 그리거나 좌표를 입력해야 검색을 시작할 수 있다.
    const [aoi, setAoi] = useState<Array<[number, number]> | null>(null);
    const [previewAoi, setPreviewAoi] = useState<SavedAoi | null>(null);
    const [activeTool, setActiveTool] = useState<MapTool | undefined>(undefined);
    const [pendingSearch, setPendingSearch] = useState(false);
    const [fitKey, setFitKey] = useState('init');

    // ── AOI 좌표 입력 / 팝오버 ────────────────────────────────────────────────
    const [nwInput, setNwInput] = useState({ lat: '', lon: '' });
    const [seInput, setSeInput] = useState({ lat: '', lon: '' });
    const [aoiErrors, setAoiErrors] = useState<Set<AoiField>>(() => new Set());
    const [aoiOpen, setAoiOpen] = useState(false);
    const aoiTriggerRef = useRef<HTMLButtonElement | null>(null);

    // ── 선택 / 모달 / 결과 패널 ──────────────────────────────────────────────
    const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
    const [sceneModal, setSceneModal] = useState<SearchUI.Scene | null>(null);
    const [checked, setChecked] = useState<Set<string>>(() => new Set());
    const [resultsOpen, setResultsOpen] = useState(true);
    const [resultsTab, setResultsTab] = useState<'list' | 'timeline'>('list');

    // ── 페이지네이션 ──────────────────────────────────────────────────────────
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(4);

    // ── 검색 결과(SWR) ────────────────────────────────────────────────────────
    const searchKey = useMemo<SearchUI.SearchParams>(
        () => ({ platform, filters: appliedFilters, s2Filters, query }),
        [platform, appliedFilters, s2Filters, query],
    );
    const { scenes, facetCounts, isLoading, isValidating } = useSceneSearchQuery({
        service: uiService,
        searchParams: searchKey,
    });
    // "scene 검색 중…" 오버레이는 한 번이라도 검색을 누른 뒤(재검증 포함)에만 노출.
    const isSearching = hasSearched && (isLoading || isValidating);

    /**
     * 검색 실행 — 사이드바 draft 필터를 appliedFilters 로 커밋하면 SWR 키가 바뀌어 재검색된다.
     * refit=false 인 경우(예: AOI 라이브러리 적용 직후) 직전 AOI 줌을 유지.
     */
    const executeSearch = useCallback(
        (draft: SearchUI.Filters, opts?: { refit?: boolean }) => {
            const refit = opts?.refit ?? true;
            setAppliedFilters(draft);
            setHasSearched(true);
            if (refit) setFitKey(`fit-${Date.now()}`);
        },
        [],
    );

    const runSearch = useCallback(() => {
        if (isSearching) return;
        if (!aoi) {
            // AOI 미설정 → 사각형 그리기 모드를 켜고 그린 뒤 자동 검색.
            setPendingSearch(true);
            setActiveTool('bbox');
            toast('지도에서 사각형을 그려 검색 영역을 지정하세요');
            return;
        }
        executeSearch(filters);
    }, [isSearching, aoi, filters, executeSearch, toast]);

    const resetFilters = useCallback(() => {
        const def = buildDefaultFilters();
        setFilters(def);
        setAppliedFilters(def);
        setQuery('');
        setChecked(new Set());
        setHasSearched(false);
        toast('필터 초기화됨');
    }, [toast]);

    // ── ?aoi=<savedAoiId> 진입 처리(mount 1회) ────────────────────────────────
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
        if (pathname) router.replace(pathname);
    }, []);

    // ── 필터/검색어/페이지 크기 변경 시 1페이지로 리셋 ──────────────────────────
    useEffect(() => {
        setPage(1);
    }, [appliedFilters, query, pageSize]);

    /**
     * AOI 가 그려져 있고 한 번 검색된 상태에서 사이드바 검색 조건이 바뀌면 디바운스 후 자동 재검색.
     * 초기 마운트/hasSearched 토글 직후에는 발동하지 않도록 skip 플래그로 제어한다.
     * NAS 보유만/CDSE 강제 갱신 토글은 자동 재검색 트리거에서 제외.
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        filters.startDate,
        filters.endDate,
        filters.s1a,
        filters.s1c,
        filters.productMode,
        filters.grd,
        filters.raw,
        filters.pol,
        filters.passA,
        filters.passD,
    ]);

    // ── AOI bbox 파생 + 좌표 입력 동기화 ───────────────────────────────────────
    const aoiBounds = useMemo<SearchUI.AoiBounds | null>(() => {
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

    // ESC 로 그리기 모드 취소.
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

    const handleDrawEnd = useCallback(
        (_tool: MapTool, geom: DrawnGeometry) => {
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
        },
        [pendingSearch, filters, executeSearch, toast],
    );

    const onAoiChange = useCallback(
        (coords: Array<[number, number]>) => {
            // 미리보기 중에는 사용자 편집을 무시(preview 가 끝난 뒤 본 AOI 로 복귀).
            if (previewAoi) return;
            setAoi(coords);
            if (hasSearched && !isSearching) {
                executeSearch(appliedFilters);
            }
        },
        [previewAoi, hasSearched, isSearching, appliedFilters, executeSearch],
    );

    const startDrawAoi = useCallback(() => {
        setActiveTool((cur) => {
            if (cur === 'bbox') {
                // 이미 그리는 중이면 토글로 취소.
                setPendingSearch(false);
                return undefined;
            }
            setPendingSearch(false);
            setAoiOpen(false);
            return 'bbox';
        });
    }, []);

    const clearAoi = useCallback(() => {
        setAoi(null);
        setNwInput({ lat: '', lon: '' });
        setSeInput({ lat: '', lon: '' });
        setAoiErrors(new Set());
        toast('AOI 해제됨');
    }, [toast]);

    const clearAllAoiErrors = useCallback(() => {
        setAoiErrors((prev) => (prev.size === 0 ? prev : new Set()));
    }, []);

    const applyManualBbox = useCallback(() => {
        const nlat = parseFloat(nwInput.lat);
        const nlon = parseFloat(nwInput.lon);
        const slat = parseFloat(seInput.lat);
        const slon = parseFloat(seInput.lon);
        const errs = new Set<AoiField>();
        const validLat = (v: string, n: number) => v.trim() !== '' && Number.isFinite(n) && n >= -90 && n <= 90;
        const validLon = (v: string, n: number) => v.trim() !== '' && Number.isFinite(n) && n >= -180 && n <= 180;
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
    }, [nwInput, seInput, toast]);

    /** 저장된 AOI 라이브러리에서 선택 적용(SavedAoisContext 의 데이터를 받아 지도에 반영). */
    const applySavedAoi = useCallback(
        (a: SavedAoi) => {
            setAoi(aoiToRing(a));
            setPreviewAoi(null);
            setFitKey(`fit-aoi-${a.id}-${Date.now()}`);
            setAoiOpen(false);
            toast(`"${a.name}" 적용됨`, { tone: 'success' });
        },
        [toast],
    );

    // ── 결과 파생값 ──────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(scenes.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = useMemo(
        () => scenes.slice((safePage - 1) * pageSize, safePage * pageSize),
        [scenes, safePage, pageSize],
    );
    const pageRange = useMemo(() => getPageRange(safePage, totalPages), [safePage, totalPages]);

    const footprints = useMemo<MapFootprint[]>(() => {
        return scenes
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
    }, [scenes, selectedSceneId]);

    const allChecked = scenes.length > 0 && scenes.every((s) => checked.has(s.id));
    const toggleAll = useCallback(() => {
        setChecked((prev) => {
            const n = new Set(prev);
            const all = scenes.length > 0 && scenes.every((s) => prev.has(s.id));
            if (all) scenes.forEach((s) => n.delete(s.id));
            else scenes.forEach((s) => n.add(s.id));
            return n;
        });
    }, [scenes]);
    const toggleOne = useCallback((id: string) => {
        setChecked((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    }, []);
    const clearChecked = useCallback(() => setChecked(new Set()), []);

    const openSceneModal = useCallback((s: SearchUI.Scene) => {
        setSelectedSceneId(s.id);
        setSceneModal(s);
    }, []);
    const closeSceneModal = useCallback(() => setSceneModal(null), []);

    // ── 카트 commands(현재 결과 기준) ────────────────────────────────────────
    const 선택한_씬을_담는다 = useCallback(() => {
        const toAdd = scenes.filter((s) => checked.has(s.id));
        if (cart.선택한_씬을_담는다(toAdd)) setChecked(new Set());
    }, [scenes, checked, cart]);
    const 전체_씬을_담는다 = useCallback(() => {
        cart.전체_씬을_담는다(scenes);
    }, [scenes, cart]);

    const stats = useMemo(() => {
        const totalGb = scenes.reduce((a, s) => a + parseFloat(s.size), 0);
        const haveCount = scenes.filter((s) => s.have).length;
        const needCount = scenes.length - haveCount;
        const resultDates = scenes.map((s) => s.date.slice(0, 10)).sort();
        const resultRange =
            resultDates.length > 0 ? `${resultDates[0]} ~ ${resultDates[resultDates.length - 1]}` : '—';
        return {
            total: scenes.length,
            totalGb,
            haveCount,
            needCount,
            resultRange,
            havePct: pct(haveCount, scenes.length),
            needPct: pct(needCount, scenes.length),
        };
    }, [scenes]);

    // 플랫폼 변경 — 준비 안 된 플랫폼은 안내.
    const handleSetPlatform = useCallback(
        (next: SearchUI.Platform) => {
            setPlatform(next);
            const def = PLATFORMS.find((p) => p.value === next);
            if (def && !def.ready) {
                toast(`${def.label} — ${def.note ?? '준비 중'}`, { tone: 'warning' });
            }
        },
        [toast],
    );

    const value = useMemo<SearchContextValue>(
        () => ({
            scenes,
            facetCounts,
            isSearching,
            hasSearched,
            platform,
            setPlatform: handleSetPlatform,
            filters,
            setFilters,
            appliedFilters,
            setAppliedFilters,
            s2Filters,
            setS2Filters,
            query,
            setQuery,
            resetFilters,
            runSearch,
            aoi,
            aoiBounds,
            previewAoi,
            setPreviewAoi,
            activeTool,
            fitKey,
            setFitKey,
            handleDrawEnd,
            onAoiChange,
            startDrawAoi,
            clearAoi,
            applyManualBbox,
            applySavedAoi,
            nwInput,
            setNwInput,
            seInput,
            setSeInput,
            aoiErrors,
            clearAllAoiErrors,
            aoiOpen,
            setAoiOpen,
            aoiTriggerRef,
            selectedSceneId,
            setSelectedSceneId,
            sceneModal,
            openSceneModal,
            closeSceneModal,
            checked,
            toggleAll,
            toggleOne,
            clearChecked,
            allChecked,
            resultsOpen,
            setResultsOpen,
            resultsTab,
            setResultsTab,
            page,
            setPage,
            pageSize,
            setPageSize,
            safePage,
            totalPages,
            paginated,
            pageRange,
            footprints,
            stats,
            inCart: cart.inCart,
            씬을_담는다: cart.씬을_담는다,
            씬을_담고_안내한다: cart.씬을_담고_안내한다,
            선택한_씬을_담는다,
            전체_씬을_담는다,
        }),
        [
            scenes,
            facetCounts,
            isSearching,
            hasSearched,
            platform,
            handleSetPlatform,
            filters,
            appliedFilters,
            s2Filters,
            query,
            resetFilters,
            runSearch,
            aoi,
            aoiBounds,
            previewAoi,
            activeTool,
            fitKey,
            handleDrawEnd,
            onAoiChange,
            startDrawAoi,
            clearAoi,
            applyManualBbox,
            applySavedAoi,
            nwInput,
            seInput,
            aoiErrors,
            clearAllAoiErrors,
            aoiOpen,
            selectedSceneId,
            sceneModal,
            openSceneModal,
            closeSceneModal,
            checked,
            toggleAll,
            toggleOne,
            clearChecked,
            allChecked,
            resultsOpen,
            resultsTab,
            page,
            pageSize,
            safePage,
            totalPages,
            paginated,
            pageRange,
            footprints,
            stats,
            cart,
            선택한_씬을_담는다,
            전체_씬을_담는다,
        ],
    );

    return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchContext(): SearchContextValue {
    const ctx = useContext(SearchContext);
    if (ctx == null) {
        throw new Error('useSearchContext는 SearchProvider 내부에서만 사용할 수 있습니다.');
    }
    return ctx;
}
