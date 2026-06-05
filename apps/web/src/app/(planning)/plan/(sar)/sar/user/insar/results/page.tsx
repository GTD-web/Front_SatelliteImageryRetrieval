'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import {
    Icon,
    InfoTip,
    MapCanvas,
    Modal,
    Quicklook,
    useToast,
    type MapPoint,
    type MapRasterOverlay,
    type MapVelocityLegend,
} from '@/_ui/hifi';
import {
    GRADE_COLOR,
    GRADE_LABEL,
    METRIC_DEFS,
    clamp01,
    isMisleading,
    qaForId,
} from '@/_shared/insar-qa';

import { Section, typeBadge } from '../_shared';

// ────────────────────────────────────────────────────────────────────────────
// 결과(완료된 산출물) 모킹 데이터
// ────────────────────────────────────────────────────────────────────────────

interface InsarProduct {
    id: string;
    name: string;
    type: 'DInSAR' | 'SBAS' | 'PSInSAR';
    range: string;
    mission: string;
    size: string;
    scenes: number;
    owner: string;
}

const PRODUCTS: InsarProduct[] = [
    {
        id: 'pohang-q4',
        name: 'Pohang subsidence 2025Q4',
        type: 'DInSAR',
        range: '2025-10-01 ~ 2025-12-30',
        mission: 'S1A',
        size: '512 MB',
        scenes: 2,
        owner: '김연구원',
    },
    {
        id: 'gyeongju-sbas',
        name: 'Gyeongju SBAS 2024-2025',
        type: 'SBAS',
        range: '2024-01 ~ 2025-12',
        mission: 'S1A',
        size: '14.2 GB',
        scenes: 38,
        owner: '박지수',
    },
    {
        id: 'gimhae',
        name: 'Gimhae 산사태 모니터',
        type: 'DInSAR',
        range: '2025-08-12 ~ 2025-08-24',
        mission: 'S1A',
        size: '498 MB',
        scenes: 2,
        owner: '이민호',
    },
    {
        id: 'busan-ps',
        name: 'Busan Port PSInSAR',
        type: 'PSInSAR',
        range: '2023-01 ~ 2025-12',
        mission: 'S1A·S1C',
        size: '142 MB',
        scenes: 86,
        owner: '최윤라',
    },
    {
        id: 'ulleung',
        name: 'Ulleungdo SBAS',
        type: 'SBAS',
        range: '2024-06 ~ 2026-03',
        mission: 'S1A',
        size: '8.7 GB',
        scenes: 28,
        owner: '시스템',
    },
];

const POINT_COLORS = ['#dc2626', '#2563eb', '#10b981', '#f59e0b', '#a855f7', '#06b6d4', '#f472b6', '#84cc16'];

const TIMESERIES_DATES = [
    '25-10', '25-11', '25-12', '26-01', '26-02', '26-03',
    '26-04', '26-05', '26-06', '26-07', '26-08', '26-09',
];

interface SceneItem {
    id: string;
    date: string;
    role: 'master' | 'slave';
    polarization: string;
    size: string;
}

function generateScenes(product: InsarProduct): SceneItem[] {
    const [startStr] = product.range.split(' ~ ');
    const start = startStr.length >= 10 ? new Date(startStr) : new Date(`${startStr}-01`);
    const stepDays = 12;
    const polarization = 'VV+VH';
    const sceneSize = product.type === 'PSInSAR' || product.type === 'SBAS' ? '4.1 GB' : '1.7 GB';
    const missionPrefix = product.mission.includes('S1C') ? 'S1C' : 'S1A';
    const productSuffix = product.type === 'DInSAR' ? 'GRDH_1SDV' : 'SLC__1SDV';
    return Array.from({ length: product.scenes }).map((_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i * stepDays);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const id = `${missionPrefix}_IW_${productSuffix}_${yyyy}${mm}${dd}T211515_${yyyy}${mm}${dd}T211544_0${(i % 9) + 1}A123_2B${(i % 16).toString(16).padStart(2, '0').toUpperCase()}`;
        return {
            id,
            date: `${yyyy}-${mm}-${dd}`,
            role: i === 0 ? 'master' : 'slave',
            polarization,
            size: sceneSize,
        };
    });
}

function simulateSeries(seed: number, len = 12): number[] {
    let s = seed;
    const out = [0];
    for (let i = 1; i < len; i++) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const trend = seed % 3 === 0 ? -2 : seed % 3 === 1 ? 1.1 : 0;
        const noise = (s / 0x7fffffff - 0.5) * 4;
        const prev = out[i - 1] ?? 0;
        out.push(+(prev + trend + noise).toFixed(1));
    }
    return out;
}

interface Point {
    id: string;
    /** Longitude (EPSG:4326) */
    lon: number;
    /** Latitude (EPSG:4326) */
    lat: number;
    color: string;
    series: number[];
}

const PRODUCT_CENTERS: Record<string, [number, number]> = {
    'pohang-q4': [129.37, 36.02],
    'gyeongju-sbas': [129.22, 35.85],
    gimhae: [128.88, 35.24],
    'busan-ps': [129.08, 35.18],
    ulleung: [130.9, 37.49],
};

/** 산출물 미리보기 raster 가 깔리는 lon/lat 사각형. 중심 ± 약 25/18km 패치. */
function productExtent(productId: string): [number, number, number, number] {
    const [lon, lat] = PRODUCT_CENTERS[productId] ?? [129.37, 36.02];
    const dLon = 0.25;
    const dLat = 0.18;
    return [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
}

type Layer = 'mean_velocity' | 'coherence' | 'cumulative_disp' | 'wrapped_phase';

const LAYER_META: Record<Layer, { unit: string; label: string }> = {
    mean_velocity: { unit: 'mm/yr', label: 'mean_velocity' },
    coherence: { unit: '0–1', label: 'coherence' },
    cumulative_disp: { unit: 'mm', label: 'cumulative_disp' },
    wrapped_phase: { unit: 'rad', label: 'wrapped_phase' },
};

/** 레이어 전환 시 범위 입력을 단위에 맞춰 자동 재설정한다. */
const LAYER_DEFAULT_RANGE: Record<Layer, [number, number]> = {
    mean_velocity: [-30, 30],
    coherence: [0, 1],
    cumulative_disp: [-50, 50],
    wrapped_phase: [-3.14, 3.14],
};

type Colormap = 'RdBu' | 'viridis' | 'magma';

const COLORMAP_GRADIENTS: Record<Colormap, string> = {
    RdBu: 'linear-gradient(to right, #2563eb, #60a5fa, #f1f5f9, #fb923c, #dc2626)',
    viridis: 'linear-gradient(to right, #440154, #3b528b, #21918c, #5ec962, #fde725)',
    magma: 'linear-gradient(to right, #000004, #51127c, #b73779, #fc8961, #fcfdbf)',
};

const COLORMAP_STOPS: Record<Colormap, Array<[number, number, number]>> = {
    RdBu: [hex('#2563eb'), hex('#60a5fa'), hex('#f1f5f9'), hex('#fb923c'), hex('#dc2626')],
    viridis: [hex('#440154'), hex('#3b528b'), hex('#21918c'), hex('#5ec962'), hex('#fde725')],
    magma: [hex('#000004'), hex('#51127c'), hex('#b73779'), hex('#fc8961'), hex('#fcfdbf')],
};

function hex(s: string): [number, number, number] {
    const v = parseInt(s.slice(1), 16);
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function sampleColormap(cm: Colormap, t: number): [number, number, number] {
    const stops = COLORMAP_STOPS[cm];
    const u = t < 0 ? 0 : t > 1 ? 1 : t;
    const seg = u * (stops.length - 1);
    const i = Math.floor(seg);
    const f = seg - i;
    const a = stops[i] ?? stops[0]!;
    const b = stops[Math.min(stops.length - 1, i + 1)] ?? a;
    return [
        Math.round(a[0] + (b[0] - a[0]) * f),
        Math.round(a[1] + (b[1] - a[1]) * f),
        Math.round(a[2] + (b[2] - a[2]) * f),
    ];
}

/** 산출물 미리보기 레이어를 합성한다. 실제 InSAR 산출물 대신 시각적 데모용 패턴을 그린다.
 *  레이어/컬러맵/범위 변화에 반응해서 지도 위 오버레이 외관이 즉각 변하도록 의도. */
function buildInsarRaster(opts: {
    productId: string;
    layer: Layer;
    colormap: Colormap;
    rangeMin: number;
    rangeMax: number;
}): string | null {
    if (typeof document === 'undefined') return null;
    const { productId, layer, colormap, rangeMin, rangeMax } = opts;
    const W = 256;
    const H = 256;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d');
    if (!ctx) return null;
    const img = ctx.createImageData(W, H);
    let seed = 1;
    for (const c of productId) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const sx = ((seed & 0xff) / 255 - 0.5) * 0.1;
    const sy = (((seed >> 8) & 0xff) / 255 - 0.5) * 0.1;
    const lo = Math.min(rangeMin, rangeMax);
    const hi = Math.max(rangeMin, rangeMax);
    const span = Math.max(1e-6, hi - lo);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const nx = x / W;
            const ny = y / H;
            const dx = nx - 0.5 + sx;
            const dy = ny - 0.5 + sy;
            const r = Math.hypot(dx, dy);
            const noise =
                (Math.sin((nx * 12 + (seed & 7)) * Math.PI) +
                    Math.sin((ny * 9 + ((seed >> 4) & 7)) * Math.PI) +
                    Math.sin(((nx + ny) * 18 + ((seed >> 8) & 7)) * Math.PI)) /
                3;
            let v: number;
            switch (layer) {
                case 'mean_velocity': {
                    const base = (lo + hi) / 2;
                    v = base + (hi - lo) * 0.5 * (-Math.exp(-r * 4) * 1.4 + noise * 0.3);
                    break;
                }
                case 'cumulative_disp': {
                    const base = (lo + hi) / 2;
                    v = base + (hi - lo) * 0.5 * (-Math.exp(-r * 3.4) * 1.6 + noise * 0.25);
                    break;
                }
                case 'coherence': {
                    v = 0.55 + noise * 0.35 - r * 0.5;
                    break;
                }
                case 'wrapped_phase': {
                    const ph = (((nx * 14 + ny * 8 + r * 18 + noise * 2) % 2) + 2) % 2 - 1;
                    v = ph * Math.PI;
                    break;
                }
                default:
                    v = 0;
            }
            const t = (v - lo) / span;
            const [rr, gg, bb] = sampleColormap(colormap, t);
            const i = (y * W + x) * 4;
            img.data[i] = rr;
            img.data[i + 1] = gg;
            img.data[i + 2] = bb;
            img.data[i + 3] = 235;
        }
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
}

// ────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────────────────────

export default function InsarResultsPage() {
    const toast = useToast();

    const [selected, setSelected] = useState('pohang-q4');
    const [typeFilter, setTypeFilter] = useState<'전체' | InsarProduct['type']>('전체');
    const [layer, setLayer] = useState<Layer>('mean_velocity');
    const [colormap, setColormap] = useState<Colormap>('RdBu');
    const [opacity, setOpacity] = useState(75);
    const [rangeMin, setRangeMin] = useState(-30);
    const [rangeMax, setRangeMax] = useState(30);
    const [points, setPoints] = useState<Point[]>([
        { id: 'A', lon: 129.33, lat: 36.01, color: '#dc2626', series: simulateSeries(3) },
        { id: 'B', lon: 129.42, lat: 36.04, color: '#2563eb', series: simulateSeries(7) },
        { id: 'C', lon: 129.38, lat: 35.98, color: '#10b981', series: simulateSeries(5) },
    ]);
    const [showScenes, setShowScenes] = useState(false);
    const [fitKey, setFitKey] = useState('init');

    const product = useMemo(() => PRODUCTS.find((p) => p.id === selected) ?? PRODUCTS[0]!, [selected]);
    const filteredProducts = PRODUCTS.filter((p) => typeFilter === '전체' || p.type === typeFilter);

    const resultsPoints = useMemo<MapPoint[]>(
        () =>
            points.map((p) => ({
                id: p.id,
                coord: [p.lon, p.lat] as [number, number],
                color: p.color,
                label: p.id,
                onClick: () => removePoint(p.id),
            })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [points],
    );

    const rasterSrc = useMemo(() => {
        return buildInsarRaster({
            productId: product.id,
            layer,
            colormap,
            rangeMin,
            rangeMax,
        });
    }, [product.id, layer, colormap, rangeMin, rangeMax]);

    const mapRaster = useMemo<MapRasterOverlay | null>(() => {
        if (!rasterSrc) return null;
        return {
            src: rasterSrc,
            extent: productExtent(product.id),
            opacity: opacity / 100,
        };
    }, [rasterSrc, product.id, opacity]);

    // 산출물이 바뀌면 지도 뷰를 그 산출물에 맞춰 zoom-fit.
    useEffect(() => {
        setFitKey(`fit-product-${product.id}-${Date.now()}`);
    }, [product.id]);

    /** 지도 우상단 범례 외관 — 현재 layer/colormap/range 와 동기화. */
    const mapLegend = useMemo<MapVelocityLegend>(() => {
        const meta = LAYER_META[layer];
        const fmt = (n: number) =>
            Number.isInteger(n) ? n.toString() : n.toFixed(Math.abs(n) < 1 ? 2 : 1);
        const lo = Math.min(rangeMin, rangeMax);
        const hi = Math.max(rangeMin, rangeMax);
        const mid = (lo + hi) / 2;
        return {
            title: `${meta.label} (${meta.unit})`,
            gradient: COLORMAP_GRADIENTS[colormap],
            min: fmt(lo),
            mid: fmt(mid),
            max: hi >= 0 ? `+${fmt(hi)}` : fmt(hi),
        };
    }, [layer, colormap, rangeMin, rangeMax]);

    // ── 점 시계열 ──────────────────────────────────────────────────────
    const nextPointId = () => {
        const used = new Set(points.map((p) => p.id));
        for (const L of 'ABCDEFGH') if (!used.has(L)) return L;
        return 'Z';
    };
    function addPointAt(lon: number, lat: number) {
        if (points.length >= 8) {
            toast('최대 8개 점까지 선택할 수 있습니다', { tone: 'warning' });
            return;
        }
        const id = nextPointId();
        const seed = Math.floor(Math.abs(lon * lat * 1000));
        const color = POINT_COLORS[points.length % POINT_COLORS.length]!;
        setPoints((prev) => [...prev, { id, lon, lat, color, series: simulateSeries(seed) }]);
        toast(`점 ${id} 추가 — 시계열 계산 중…`, { tone: 'success' });
    }
    function removePoint(id: string) {
        setPoints((prev) => prev.filter((p) => p.id !== id));
        toast(`점 ${id} 제거됨`);
    }
    const clearPoints = () => {
        setPoints([]);
        toast('모든 점 해제됨');
    };
    const exportCsv = () => {
        if (points.length === 0) {
            toast('내보낼 점이 없습니다', { tone: 'warning' });
            return;
        }
        const header = 'date,' + points.map((p) => p.id).join(',') + '\n';
        const rows = TIMESERIES_DATES.map(
            (d, i) => d + ',' + points.map((p) => p.series[i] ?? '').join(','),
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `insar-${product.id}-timeseries.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast(`${points.length}개 점 시계열 CSV로 내보냄`, { tone: 'success' });
    };

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <div className="split" style={{ flex: 1 }}>
                <aside
                    className="split__side split__side--left"
                    style={{ width: 320, display: 'flex', flexDirection: 'column' }}
                >
                    <ResultsSidebar
                        products={filteredProducts}
                        allCount={PRODUCTS.length}
                        typeFilter={typeFilter}
                        onTypeFilter={setTypeFilter}
                        selected={selected}
                        onSelect={(id) => {
                            if (id === selected) return;
                            setSelected(id);
                            setPoints([]);
                        }}
                        layer={layer}
                        onLayerChange={(l) => {
                            setLayer(l);
                            const [lo, hi] = LAYER_DEFAULT_RANGE[l];
                            setRangeMin(lo);
                            setRangeMax(hi);
                        }}
                        colormap={colormap}
                        onColormapChange={setColormap}
                        opacity={opacity}
                        onOpacityChange={setOpacity}
                        rangeMin={rangeMin}
                        rangeMax={rangeMax}
                        currentProduct={product}
                        onShowScenes={() => setShowScenes(true)}
                        onDownload={() =>
                            toast(`${product.name} 다운로드 시작`, { tone: 'success' })
                        }
                        points={points}
                        onClearPoints={clearPoints}
                        onRemovePoint={removePoint}
                    />
                </aside>

                <div className="split__main">
                    <div style={{ flex: 1, position: 'relative', minHeight: 200, isolation: 'isolate' }}>
                        <MapCanvas
                            center={PRODUCT_CENTERS[product.id] ?? [129.37, 36.02]}
                            zoom={10}
                            points={resultsPoints}
                            raster={mapRaster}
                            onMapClick={(coord) => addPointAt(coord[0], coord[1])}
                            showLegend
                            legend="velocity"
                            legendOptions={mapLegend}
                            tools={[]}
                            fitKey={fitKey}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 12,
                                    left: 12,
                                    padding: '6px 12px',
                                    background: 'var(--bg-2)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    boxShadow: 'var(--shadow-md)',
                                    pointerEvents: 'none',
                                    zIndex: 3,
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                }}
                            >
                                <Icon name="mapPin" size={11} style={{ marginRight: 6, opacity: 0.6 }} />
                                {layer} · {opacity}% · 지도 클릭 → 시계열 점 추가
                            </div>
                        </MapCanvas>
                    </div>

                    <div
                        style={{
                            height: 260,
                            flexShrink: 0,
                            borderTop: '1px solid var(--border-subtle)',
                            background: 'var(--bg-2)',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            zIndex: 9,
                        }}
                    >
                        <ResultsBottomPanel points={points} onExport={exportCsv} />
                    </div>
                </div>
            </div>
            {showScenes ? (
                <ScenesModal product={product} onClose={() => setShowScenes(false)} />
            ) : null}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 결과 — 사이드바
// ────────────────────────────────────────────────────────────────────────────

interface ResultsSidebarProps {
    products: InsarProduct[];
    allCount: number;
    typeFilter: '전체' | InsarProduct['type'];
    onTypeFilter: (t: '전체' | InsarProduct['type']) => void;
    selected: string;
    onSelect: (id: string) => void;
    layer: Layer;
    onLayerChange: (l: Layer) => void;
    colormap: Colormap;
    onColormapChange: (c: Colormap) => void;
    opacity: number;
    onOpacityChange: (n: number) => void;
    rangeMin: number;
    rangeMax: number;
    currentProduct: InsarProduct;
    onShowScenes: () => void;
    onDownload: () => void;
    points: Point[];
    onClearPoints: () => void;
    onRemovePoint: (id: string) => void;
}

function ResultsSidebar({
    products,
    allCount,
    typeFilter,
    onTypeFilter,
    selected,
    onSelect,
    layer,
    onLayerChange,
    colormap,
    onColormapChange,
    opacity,
    onOpacityChange,
    rangeMin,
    rangeMax,
    currentProduct,
    onShowScenes,
    onDownload,
    points,
    onClearPoints,
    onRemovePoint,
}: ResultsSidebarProps) {
    return (
        <>
            <div className="toolbar" style={{ borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                    {(['전체', 'DInSAR', 'SBAS', 'PSInSAR'] as const).map((t) => (
                        <span
                            key={t}
                            className={`chip${typeFilter === t ? ' chip--active' : ''}`}
                            onClick={() => onTypeFilter(t)}
                        >
                            {t}
                        </span>
                    ))}
                    <span className="faint mono tabular" style={{ fontSize: 11, marginLeft: 'auto' }}>
                        {products.length}/{allCount}
                    </span>
                </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {products.length === 0 ? (
                        <div className="empty" style={{ padding: 32, fontSize: 12 }}>
                            해당 타입의 산출물이 없습니다
                        </div>
                    ) : (
                        products.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => onSelect(p.id)}
                                style={{
                                    padding: '12px 14px',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    background: selected === p.id ? 'var(--accent-soft)' : undefined,
                                    borderLeft:
                                        selected === p.id
                                            ? '3px solid var(--accent)'
                                            : '3px solid transparent',
                                    cursor: 'pointer',
                                }}
                            >
                                <div className="between">
                                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{p.name}</div>
                                    <span className={`badge ${typeBadge(p.type)}`} style={{ fontSize: 10 }}>
                                        {p.type}
                                    </span>
                                </div>
                                <div className="mono tabular faint" style={{ fontSize: 11, marginTop: 3 }}>
                                    {p.range}
                                </div>
                                <div className="row gap-2" style={{ marginTop: 5, fontSize: 11 }}>
                                    <span className="faint">{p.mission}</span>
                                    <span className="faint">·</span>
                                    <span className="mono tabular">{p.scenes}</span>
                                    <span className="faint">scenes</span>
                                    <span className="faint" style={{ marginLeft: 'auto' }}>
                                        {p.size}
                                    </span>
                                </div>
                                <ProductConfidenceRow productId={p.id} />
                            </div>
                        ))
                    )}
                </div>

                <QaSummarySection productId={currentProduct.id} />

                <Section title="레이어">
                    <div className="col gap-1">
                        {(Object.entries(LAYER_META) as [Layer, { unit: string; label: string }][]).map(
                            ([k, meta]) => {
                                const on = layer === k;
                                return (
                                    <div
                                        key={k}
                                        onClick={() => onLayerChange(k)}
                                        className="between"
                                        style={{
                                            padding: '7px 10px',
                                            borderRadius: 5,
                                            background: on ? 'var(--accent-soft)' : 'transparent',
                                            border: on
                                                ? '1px solid var(--accent-border)'
                                                : '1px solid transparent',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <span className="row gap-2">
                                            <span
                                                style={{
                                                    width: 7,
                                                    height: 7,
                                                    borderRadius: 50,
                                                    background: on
                                                        ? 'var(--accent)'
                                                        : 'var(--text-tertiary)',
                                                }}
                                            />
                                            <span
                                                className="mono"
                                                style={{ fontSize: 11.5, fontWeight: on ? 600 : 400 }}
                                            >
                                                {k}
                                            </span>
                                        </span>
                                        <span className="faint" style={{ fontSize: 10.5 }}>
                                            {meta.unit}
                                        </span>
                                    </div>
                                );
                            },
                        )}
                    </div>
                </Section>

                <Section title="컬러맵">
                    <div className="segmented" style={{ display: 'flex', width: '100%' }}>
                        {(['RdBu', 'viridis', 'magma'] as const).map((cm) => (
                            <button
                                key={cm}
                                type="button"
                                className={colormap === cm ? 'active' : ''}
                                style={{ flex: 1 }}
                                onClick={() => onColormapChange(cm)}
                            >
                                {cm}
                            </button>
                        ))}
                    </div>
                    <div
                        style={{
                            marginTop: 8,
                            height: 12,
                            borderRadius: 3,
                            background: COLORMAP_GRADIENTS[colormap],
                            border: '1px solid var(--border-default)',
                        }}
                    />
                    <div
                        className="between mono tabular"
                        style={{ fontSize: 10, marginTop: 4, color: 'var(--text-tertiary)' }}
                    >
                        <span>{rangeMin}</span>
                        <span>0</span>
                        <span>+{rangeMax}</span>
                    </div>
                </Section>

                <Section title={`투명도 — ${opacity}%`}>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={opacity}
                        onChange={(e) => onOpacityChange(+e.target.value)}
                        style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                </Section>

                <Section title={`선택된 점 (${points.length}/8)`}>
                    {points.length === 0 ? (
                        <div className="faint" style={{ fontSize: 11.5 }}>
                            지도 클릭하여 시계열 점 추가
                        </div>
                    ) : (
                        <div className="col gap-2">
                            {points.map((p) => (
                                <div
                                    key={p.id}
                                    className="row gap-2"
                                    style={{ padding: '5px 7px', borderRadius: 4, background: 'var(--bg-3)' }}
                                >
                                    <span
                                        style={{
                                            width: 13,
                                            height: 13,
                                            borderRadius: 50,
                                            background: p.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontSize: 10,
                                            fontWeight: 700,
                                        }}
                                    >
                                        {p.id}
                                    </span>
                                    <span
                                        className="mono tabular faint"
                                        style={{ fontSize: 11, flex: 1 }}
                                    >
                                        {p.lon.toFixed(3)}E, {p.lat.toFixed(3)}N
                                    </span>
                                    <Icon
                                        name="x"
                                        size={11}
                                        style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }}
                                        onClick={() => onRemovePoint(p.id)}
                                    />
                                </div>
                            ))}
                            <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                style={{ alignSelf: 'flex-start' }}
                                onClick={onClearPoints}
                            >
                                전체 해제
                            </button>
                        </div>
                    )}
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
                <div className="mono faint" style={{ fontSize: 11, marginBottom: 8, lineHeight: 1.45 }}>
                    {currentProduct.name} · {currentProduct.scenes} scenes · LOS inc=39.2°
                </div>
                <div className="row gap-2">
                    <button
                        type="button"
                        className="btn btn--sm"
                        onClick={onShowScenes}
                        style={{ flex: 1 }}
                    >
                        원본 scene
                    </button>
                    <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={onDownload}
                        style={{ flex: 1 }}
                    >
                        <Icon name="download" size={13} /> 다운로드
                    </button>
                </div>
            </div>
        </>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 결과 — 하단 시계열 패널
// ────────────────────────────────────────────────────────────────────────────

function ResultsBottomPanel({ points, onExport }: { points: Point[]; onExport: () => void }) {
    return (
        <>
            <div
                className="between"
                style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}
            >
                <div className="row gap-3">
                    <div className="row gap-2">
                        <Icon name="chart" size={14} />
                        <span style={{ fontWeight: 600 }}>LOS 변위 시계열</span>
                    </div>
                    <div className="row gap-1">
                        {points.map((p) => (
                            <span
                                key={p.id}
                                className="badge"
                                style={{
                                    background: p.color + '22',
                                    color: p.color,
                                    border: `1px solid ${p.color}44`,
                                }}
                            >
                                ● {p.id}
                            </span>
                        ))}
                    </div>
                </div>
                <button type="button" className="btn btn--ghost btn--sm" onClick={onExport}>
                    <Icon name="download" size={11} /> CSV 내보내기
                </button>
            </div>
            <div style={{ padding: '12px 16px', flex: 1, minHeight: 0 }}>
                {points.length === 0 ? (
                    <div className="empty" style={{ padding: 20, fontSize: 12 }}>
                        지도에서 점을 찍으면 시계열이 여기 표시됩니다
                    </div>
                ) : (
                    <TimeseriesChart points={points} />
                )}
            </div>
        </>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 시계열 차트
// ────────────────────────────────────────────────────────────────────────────

function TimeseriesChart({ points }: { points: Point[] }) {
    const data = TIMESERIES_DATES.map((date, i) => {
        const row: Record<string, number | string> = { date };
        points.forEach((p) => {
            const v = p.series[i];
            if (typeof v === 'number') row[p.id] = v;
        });
        return row;
    });

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
                    stroke="var(--border-default)"
                />
                <YAxis
                    width={40}
                    tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
                    stroke="var(--border-default)"
                    label={{
                        value: 'mm',
                        angle: 0,
                        position: 'insideTopLeft',
                        offset: -2,
                        style: { fontSize: 10, fill: 'var(--text-tertiary)' },
                    }}
                />
                <Tooltip
                    contentStyle={{
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 6,
                        fontSize: 12,
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                    itemStyle={{ fontFamily: 'var(--font-mono)' }}
                    formatter={(value) => [
                        typeof value === 'number' ? `${value.toFixed(1)} mm` : String(value),
                        '',
                    ]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                <ReferenceLine y={0} stroke="var(--border-default)" strokeDasharray="3 3" />
                {points.map((p) => (
                    <Line
                        key={p.id}
                        type="monotone"
                        dataKey={p.id}
                        stroke={p.color}
                        strokeWidth={1.8}
                        dot={{ r: 2.5, fill: p.color, strokeWidth: 0 }}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 분석 신뢰도(QA) — 사용자 뷰어용 요약
//
// 점수·등급 로직은 관리자 분석 품질 화면과 동일한 `@/_shared/insar-qa` 를
// 공유한다. 변위(결과)만 보고 신뢰하지 않도록 신뢰도를 함께 노출한다.
// ────────────────────────────────────────────────────────────────────────────

/** 산출물 목록 행에 들어가는 한 줄짜리 신뢰도 표시. */
function ProductConfidenceRow({ productId }: { productId: string }) {
    const qa = qaForId(productId);
    if (!qa) return null;
    const { conf, score } = qa;
    return (
        <div className="row gap-1" style={{ marginTop: 5, alignItems: 'center', fontSize: 10.5 }}>
            <span
                style={{ width: 7, height: 7, borderRadius: 50, background: GRADE_COLOR[conf.grade], flexShrink: 0 }}
            />
            <span className="faint">신뢰도</span>
            <span style={{ color: GRADE_COLOR[conf.grade], fontWeight: 600 }}>{conf.band}</span>
            <span className="mono tabular faint">{score.toFixed(2)}</span>
            {isMisleading(qa.product, conf) ? (
                <span
                    className="row gap-1"
                    style={{ marginLeft: 'auto', color: 'var(--danger)', alignItems: 'center' }}
                >
                    <Icon name="x" size={10} />
                    저신뢰
                </span>
            ) : null}
        </div>
    );
}

/** 선택된 산출물의 신뢰도 상세 — 사이드바 섹션. */
function QaSummarySection({ productId }: { productId: string }) {
    const qa = qaForId(productId);
    if (!qa) return null;
    const { product, score, conf } = qa;
    const m = product.metrics;
    const metrics = METRIC_DEFS.filter((d) => !(d.skipForDinsar && product.type === 'DInSAR'));
    const misleading = isMisleading(product, conf);

    return (
        <Section
            title="분석 신뢰도"
            info="InSAR 결과는 변위가 커도 신뢰도가 낮을 수 있습니다. 코히런스·언랩·네트워크·대기 영향·잔차를 가중 합성한 점수입니다. 점수가 낮으면 결과를 그대로 믿지 않는 것이 좋습니다."
        >
            <div className="col gap-2">
                <div className="between" style={{ alignItems: 'center' }}>
                    <span
                        className="badge"
                        style={{
                            color: GRADE_COLOR[conf.grade],
                            background: `color-mix(in srgb, ${GRADE_COLOR[conf.grade]} 14%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${GRADE_COLOR[conf.grade]} 35%, transparent)`,
                            fontWeight: 600,
                        }}
                    >
                        신뢰도 {conf.band}
                    </span>
                    <span className="row gap-2" style={{ alignItems: 'center' }}>
                        <div className="progress" style={{ width: 56, height: 6 }} aria-hidden>
                            <div
                                className="progress__fill"
                                style={{ width: `${Math.round(score * 100)}%`, background: GRADE_COLOR[conf.grade] }}
                            />
                        </div>
                        <span className="mono tabular" style={{ fontWeight: 600, fontSize: 12 }}>
                            {score.toFixed(2)}
                        </span>
                    </span>
                </div>

                {misleading ? (
                    <div
                        className="row gap-2"
                        style={{
                            padding: '8px 10px',
                            borderRadius: 5,
                            background: 'var(--danger-soft)',
                            border: '1px solid var(--danger-soft)',
                            alignItems: 'flex-start',
                        }}
                    >
                        <Icon name="x" size={12} style={{ color: 'var(--danger)', marginTop: 1, flexShrink: 0 }} />
                        <span style={{ fontSize: 10.5, lineHeight: 1.45, color: 'var(--danger)' }}>
                            변위 {Math.abs(product.velocityMmYr)}mm/yr 로 크지만 코히런스 붕괴·언랩 오류로{' '}
                            <InfoTip
                                trigger="hover"
                                placement="top"
                                text="artifact(허상)는 실제 지표 변위가 아니라 코히런스 저하·위상 언랩 오류 등 처리 과정에서 생긴 가짜 신호입니다. 진짜 침하/융기로 해석하면 안 됩니다."
                            >
                                artifact
                            </InfoTip>
                            일 가능성이 높습니다. 결과 해석에 주의하세요.
                        </span>
                    </div>
                ) : null}

                <div className="col gap-2" style={{ marginTop: 2 }}>
                    {metrics.map((d) => {
                        const raw = m[d.key] as number;
                        const g = d.grade(raw);
                        return (
                            <div key={d.key} className="col" style={{ gap: 3 }}>
                                <div className="between" style={{ fontSize: 11 }}>
                                    <span className="row" style={{ alignItems: 'center', gap: 4 }}>
                                        <span
                                            style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: 50,
                                                background: GRADE_COLOR[g],
                                                flexShrink: 0,
                                            }}
                                        />
                                        {d.label}
                                        <InfoTip text={`${d.info}\n\n기준: ${d.rule}`} size={10} />
                                    </span>
                                    <span className="mono tabular" style={{ fontWeight: 600 }}>
                                        {d.fmt(raw)}
                                    </span>
                                </div>
                                <div className="progress" style={{ height: 4 }}>
                                    <div
                                        className="progress__fill"
                                        style={{
                                            width: `${Math.round(clamp01(d.norm(raw)) * 100)}%`,
                                            background: GRADE_COLOR[g],
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
                <span className="faint" style={{ fontSize: 10, lineHeight: 1.4 }}>
                    {GRADE_LABEL.good} / {GRADE_LABEL.usable} / {GRADE_LABEL.risk} 기준은 각 지표 ⓘ 참조
                </span>
            </div>
        </Section>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 결과 — 원본 scene 모달
// ────────────────────────────────────────────────────────────────────────────

function ScenesModal({ product, onClose }: { product: InsarProduct; onClose: () => void }) {
    const scenes = useMemo(() => generateScenes(product), [product]);
    return (
        <Modal
            title={`원본 scene 목록 — ${product.name}`}
            sub={`${product.type} · ${product.mission} · ${product.range} · ${scenes.length} scenes`}
            size="xl"
            onClose={onClose}
        >
            <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th style={{ width: 56 }}>미리보기</th>
                            <th>Scene ID</th>
                            <th style={{ width: 110 }}>관측일</th>
                            <th style={{ width: 80 }}>역할</th>
                            <th style={{ width: 90 }}>편파</th>
                            <th className="num" style={{ width: 90 }}>용량</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scenes.map((s) => (
                            <tr key={s.id}>
                                <td>
                                    {/* InSAR scene 은 항상 SLC 기반 — 정책상 미리보기 미지원이라 N/A 로 그려진다. */}
                                    <Quicklook sceneId={s.id} size={42} product="SLC" />
                                </td>
                                <td>
                                    <div className="mono truncate" style={{ fontSize: 11.5, maxWidth: 460 }}>
                                        {s.id}
                                    </div>
                                </td>
                                <td className="mono tabular faint" style={{ fontSize: 12 }}>
                                    {s.date}
                                </td>
                                <td>
                                    <span
                                        className={`badge ${s.role === 'master' ? 'badge--brand2' : 'badge--neutral'}`}
                                    >
                                        {s.role}
                                    </span>
                                </td>
                                <td className="mono tabular faint" style={{ fontSize: 12 }}>
                                    {s.polarization}
                                </td>
                                <td className="num tabular mono" style={{ fontSize: 12 }}>
                                    {s.size}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Modal>
    );
}
