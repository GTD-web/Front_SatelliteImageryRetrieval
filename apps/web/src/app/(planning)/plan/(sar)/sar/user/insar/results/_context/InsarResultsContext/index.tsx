'use client';

/**
 * InSAR 결과 뷰어 통합 Context — query + commands + UI 상태 조립
 *
 * - Service 주입 패턴으로 Plan(Mock) / Current(실제 API) 환경 분기
 * - 서버 데이터(산출물 목록)는 useState 로 들지 않고 query(SWR) 결과를 그대로 전달
 * - selected/layer/colormap/opacity/range/points/showScenes 등 순수 UI 상태만 useState 로 보관
 * - filtered/current 는 데이터 + UI 상태에서 파생되는 값이라 useMemo 로만 계산한다.
 * - 점 추가/제거/해제는 지도 클릭으로 UI 상태를 바꾸는 동작이라 토스트 피드백과 함께 Context 에 둔다.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useToast } from '@/_ui/hifi';
import type { IInsarResultsService } from '../../_services/insar-results.service.interface';
import type { InsarResultsUI } from '../../_mocks/insar-results.ui-interface';
import { POINT_COLORS, LAYER_DEFAULT_RANGE } from '../../_constants/insar-results-layers';
import { simulateSeries } from '../../_constants/insar-results-raster';
import { useResultsDataQuery } from './queries/use-results-data-query';
import { useResultsCommands } from './commands/use-results-commands';

interface InsarResultsContextValue {
    // 데이터 (SWR)
    products: InsarResultsUI.InsarProduct[];
    로딩중: boolean;
    오류: unknown;

    // 파생 (데이터 + UI 상태)
    /** typeFilter 로 거른 산출물 목록 (사이드바 select 소스) */
    filtered: InsarResultsUI.InsarProduct[];
    /** selected 로 고른 현재 산출물 (지도/통계/모달 소스) */
    current: InsarResultsUI.InsarProduct | null;
    /** 전체 산출물 수 (필터 카운트 표시용) */
    allCount: number;

    // UI 상태 — 선택/필터
    selected: string;
    setSelected: (id: string) => void;
    typeFilter: InsarResultsUI.TypeFilter;
    setTypeFilter: (t: InsarResultsUI.TypeFilter) => void;

    // UI 상태 — 오버레이 컨트롤
    layer: InsarResultsUI.Layer;
    changeLayer: (l: InsarResultsUI.Layer) => void;
    colormap: InsarResultsUI.Colormap;
    setColormap: (c: InsarResultsUI.Colormap) => void;
    opacity: number;
    setOpacity: (v: number) => void;
    rangeMin: number;
    rangeMax: number;

    // UI 상태 — 시계열 점
    points: InsarResultsUI.Point[];
    addPointAt: (lon: number, lat: number) => void;
    removePoint: (id: string) => void;
    clearPoints: () => void;

    // UI 상태 — 모달 / 지도 fit
    showScenes: boolean;
    setShowScenes: (open: boolean) => void;
    fitKey: string;

    // commands
    산출물을_다운로드한다: (productId: string) => Promise<InsarResultsUI.ServiceResponse>;
    시계열을_CSV로_내보낸다: (points: InsarResultsUI.Point[], productId: string) => void;
}

const InsarResultsContext = createContext<InsarResultsContextValue | undefined>(undefined);

export function InsarResultsProvider({
    children,
    uiService,
}: {
    children: ReactNode;
    uiService: IInsarResultsService;
}) {
    const toast = useToast();

    const [selected, setSelected] = useState('pohang-q4');
    const [typeFilter, setTypeFilter] = useState<InsarResultsUI.TypeFilter>('전체');
    const [layer, setLayer] = useState<InsarResultsUI.Layer>('mean_velocity');
    const [colormap, setColormap] = useState<InsarResultsUI.Colormap>('RdBu');
    const [opacity, setOpacity] = useState(75);
    const [rangeMin, setRangeMin] = useState(-30);
    const [rangeMax, setRangeMax] = useState(30);
    const [points, setPoints] = useState<InsarResultsUI.Point[]>([
        { id: 'A', lon: 129.33, lat: 36.01, color: '#dc2626', series: simulateSeries(3) },
        { id: 'B', lon: 129.42, lat: 36.04, color: '#2563eb', series: simulateSeries(7) },
        { id: 'C', lon: 129.38, lat: 35.98, color: '#10b981', series: simulateSeries(5) },
    ]);
    const [showScenes, setShowScenes] = useState(false);
    const [fitKey, setFitKey] = useState('init');

    const { resultsData, isLoading, error } = useResultsDataQuery({ service: uiService });
    const { 산출물을_다운로드한다, 시계열을_CSV로_내보낸다 } = useResultsCommands({ service: uiService });

    const products = resultsData.products;

    const filtered = useMemo(
        () => products.filter((p) => typeFilter === '전체' || p.type === typeFilter),
        [products, typeFilter],
    );

    const current = useMemo<InsarResultsUI.InsarProduct | null>(
        () => products.find((p) => p.id === selected) ?? products[0] ?? null,
        [products, selected],
    );

    // 타입 필터로 현재 선택이 목록에서 빠지면 첫 항목으로 자동 전환 — select 가 빈 값이 되지 않도록.
    useEffect(() => {
        if (filtered.length === 0) return;
        if (!filtered.some((p) => p.id === selected)) {
            setSelected(filtered[0]!.id);
            setPoints([]);
        }
        // filtered/selected 는 의도적으로 제외 — 필터 변경 시점에만 보정.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [typeFilter]);

    // 산출물이 바뀌면 지도 뷰를 그 산출물에 맞춰 zoom-fit.
    useEffect(() => {
        if (current) setFitKey(`fit-product-${current.id}-${Date.now()}`);
    }, [current?.id]);

    // 레이어 전환 — 범위 입력을 해당 단위 기본값으로 재설정한다(지도 select·범례 공용).
    const changeLayer = useCallback((l: InsarResultsUI.Layer) => {
        setLayer(l);
        const [lo, hi] = LAYER_DEFAULT_RANGE[l];
        setRangeMin(lo);
        setRangeMax(hi);
    }, []);

    const handleSelect = useCallback(
        (id: string) => {
            if (id === selected) return;
            setSelected(id);
            setPoints([]);
        },
        [selected],
    );

    // ── 점 시계열 ──────────────────────────────────────────────────────
    const nextPointId = useCallback(() => {
        const used = new Set(points.map((p) => p.id));
        for (const L of 'ABCDEFGH') if (!used.has(L)) return L;
        return 'Z';
    }, [points]);

    const addPointAt = useCallback(
        (lon: number, lat: number) => {
            if (points.length >= 8) {
                toast('최대 8개 점까지 선택할 수 있습니다', { tone: 'warning' });
                return;
            }
            const id = nextPointId();
            const seed = Math.floor(Math.abs(lon * lat * 1000));
            const color = POINT_COLORS[points.length % POINT_COLORS.length]!;
            setPoints((prev) => [...prev, { id, lon, lat, color, series: simulateSeries(seed) }]);
            toast(`점 ${id} 추가 — 시계열 계산 중…`, { tone: 'success' });
        },
        [points, nextPointId, toast],
    );

    const removePoint = useCallback(
        (id: string) => {
            setPoints((prev) => prev.filter((p) => p.id !== id));
            toast(`점 ${id} 제거됨`);
        },
        [toast],
    );

    const clearPoints = useCallback(() => {
        setPoints([]);
        toast('모든 점 해제됨');
    }, [toast]);

    const value = useMemo<InsarResultsContextValue>(
        () => ({
            products,
            로딩중: isLoading,
            오류: error,
            filtered,
            current,
            allCount: products.length,
            selected,
            setSelected: handleSelect,
            typeFilter,
            setTypeFilter,
            layer,
            changeLayer,
            colormap,
            setColormap,
            opacity,
            setOpacity,
            rangeMin,
            rangeMax,
            points,
            addPointAt,
            removePoint,
            clearPoints,
            showScenes,
            setShowScenes,
            fitKey,
            산출물을_다운로드한다,
            시계열을_CSV로_내보낸다,
        }),
        [
            products,
            isLoading,
            error,
            filtered,
            current,
            selected,
            handleSelect,
            typeFilter,
            layer,
            changeLayer,
            colormap,
            opacity,
            rangeMin,
            rangeMax,
            points,
            addPointAt,
            removePoint,
            clearPoints,
            showScenes,
            fitKey,
            산출물을_다운로드한다,
            시계열을_CSV로_내보낸다,
        ],
    );

    return <InsarResultsContext.Provider value={value}>{children}</InsarResultsContext.Provider>;
}

export function useInsarResultsContext(): InsarResultsContextValue {
    const ctx = useContext(InsarResultsContext);
    if (ctx == null) {
        throw new Error('useInsarResultsContext는 InsarResultsProvider 내부에서만 사용할 수 있습니다.');
    }
    return ctx;
}
