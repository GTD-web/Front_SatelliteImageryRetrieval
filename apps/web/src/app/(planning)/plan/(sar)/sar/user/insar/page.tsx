'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
    DateRangePicker,
    Icon,
    InfoTip,
    MapCanvas,
    Modal,
    PageHeader,
    Quicklook,
    useToast,
    type MapFootprint,
    type MapPoint,
    type MapRasterOverlay,
    type MapTool,
    type MapVelocityLegend,
} from '@/_ui/hifi';

import { aoiToRing, useSavedAois, type SavedAoi } from '@/_shared/contexts/SavedAoisContext';
import { LoadAoiMenu, SaveAoiButton } from '../../_components/SavedAoiControls';
import { RequestTimelinePanel } from '../../_components/SceneTimelinePanel';

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

const typeBadge = (t: InsarProduct['type']) =>
    t === 'DInSAR' ? 'badge--info' : t === 'SBAS' ? 'badge--warning' : 'badge--brand2';

// ────────────────────────────────────────────────────────────────────────────
// 분석 요청 (request) 모델
// ────────────────────────────────────────────────────────────────────────────

type Tab = 'request' | 'results';

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

/**
 * 두 풋프린트(폴리곤 ring) 의 겹침 비율을 bbox 근사로 계산.
 * 결과 = (교집합 면적 / 더 작은 쪽 풋프린트 면적) × 100. 0 ~ 100.
 *
 * DInSAR 가이드라인:
 *   ≥80% — 안정적 (동일 트랙/궤도 기준 일반적)
 *   70~80% — 권장 하한선
 *   <70% — 분석 가용 면적이 좁아 권장하지 않음
 * (단, 본 UI 에서는 정보로만 표시하고 제출을 막지는 않음.)
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
 * 실제로는 카탈로그에서 fetch, 여기서는 12-day(혹은 6-day) cadence 로 생성.
 */
function generateAvailableScenes(form: RequestForm): AvailableScene[] {
    const aoi = parseAoiFromForm(form);
    if (!aoi) return [];
    const missions: ('S1A' | 'S1C')[] = [];
    if (form.s1a) missions.push('S1A');
    if (form.s1c) missions.push('S1C');
    if (missions.length === 0) return [];
    const day = 24 * 60 * 60 * 1000;
    // 고정 anchor 기준 cadence — startDate 가 바뀌어도 각 scene 의 절대 위치(t, id, perp, offset)
    // 는 불변. 사이드바/핸들로 기간을 줄이면 양 끝에서 scene 만 잘려나가고, 안쪽 마커는 그대로 유지.
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

export default function InsarPage() {
    // useSearchParams 가 SSR 시 Suspense 경계를 요구. 페이지 본체를 별도 컴포넌트로 감싸 처리.
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

    // 결과 모드 상태
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

    // 요청 모드 상태
    const [request, setRequest] = useState<RequestForm>(() => buildDefaultRequest());
    const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(() => new Set());
    /** 저장된 AOI 메뉴에서 호버 중인 항목. 지도에 임시로 그려지지만 폼/요청 상태는 변하지 않음. */
    const [previewAoi, setPreviewAoi] = useState<SavedAoi | null>(null);
    /** MapCanvas 의 fit 트리거 — 변경 시 AOI/풋프린트에 맞춰 줌인 애니메이션. */
    const [fitKey, setFitKey] = useState('init');

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
            setTab('request');
            setFitKey(`fit-aoi-${found.id}-${Date.now()}`);
            toast(`"${found.name}" 적용됨`, { tone: 'success' });
        }
        if (pathname) router.replace(pathname);
    }, []);
    const [submitting, setSubmitting] = useState(false);
    const [activeTool, setActiveTool] = useState<MapTool | undefined>(undefined);
    const [hoveredSceneId, setHoveredSceneId] = useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = useState(true);
    // 기간/AOI/미션이 바뀌면 사용 가능한 scene 을 다시 가져오는 척 — 지도 위에 로딩 오버레이.
    // 핸들 드래그처럼 deps 가 빠르게 연속 변하는 동안에는 오버레이가 깜빡이지 않아야 하므로
    // 마지막 변경 후 300ms 동안 잠잠해야 비로소 로딩이 떠야 한다 (debounce on entry).
    const [fetchingScenes, setFetchingScenes] = useState(false);
    const fetchEnterRef = useRef<number | null>(null);
    const fetchExitRef = useRef<number | null>(null);
    const fetchInitialRef = useRef(true);
    useEffect(() => {
        if (fetchInitialRef.current) {
            fetchInitialRef.current = false;
            return;
        }
        // deps 가 다시 바뀌었으면 진행 중인 entry/exit 타이머 모두 취소하고 표시도 끔.
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

    const product = useMemo(() => PRODUCTS.find((p) => p.id === selected) ?? PRODUCTS[0]!, [selected]);
    const filteredProducts = PRODUCTS.filter((p) => typeFilter === '전체' || p.type === typeFilter);

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

    // 유형 변경 / scene 목록 변경 시 선택을 재조정
    const toggleSceneSelection = (id: string) => {
        setSelectedSceneIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                return next;
            }
            // DInSAR: 정확히 2개 유지. 이미 2개가 선택돼 있으면 가장 마지막에 선택했던 scene 을
            // 새로 누른 scene 으로 대체 (Set 의 삽입 순서 마지막 항목을 제거).
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

    /** 빠른 전체 선택 — DInSAR 면 첫/마지막 scene 으로 페어, 그 외는 모든 가용 scene. */
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

    // 지도 중심: 첫 진입 시점만 사용 (MapCanvas 가 prop 변경 시 view 를 옮기지 않음)
    const initialCenter: [number, number] = requestAoi
        ? aoiCenter(requestAoi) ?? [129.37, 36.02]
        : [129.37, 36.02];

    // 지도 위 footprint — 시각적 노이즈를 최소화하기 위해 후보 outline 은 표시하지 않고,
    //   • 선택 scene 0~1개: 그 한 장의 footprint 를 라벨과 함께 부각
    //   • 선택 scene 2개 이상: 개별 footprint 는 흐리게(fill 없는 cyan outline) 깔고
    //                         그 위에 모든 footprint 의 교집합을 "공통 커버리지"(green)로 강조 + 라벨
    //   • timeline hover: 해당 scene footprint 만 cyan(fill+stroke)로 1장 추가 표시
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
            // 단일 선택 — 그대로 cyan + 라벨
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
            // 다중 선택 — 개별 footprint 는 흐리게(candidate 스타일), 공통 커버리지를 강조
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
        // hover 한 scene 이 있고, 아직 선택되지 않았다면 단일 cyan 으로 추가 (가장 위)
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

    /** 결과 탭 산출물 미리보기 raster. 레이어/컬러맵/범위 변화에 즉시 재생성된다.
     *  opacity 변경은 src 재계산을 유발하지 않도록 별도 메모. */
    const rasterSrc = useMemo(() => {
        if (tab !== 'results') return null;
        return buildInsarRaster({
            productId: product.id,
            layer,
            colormap,
            rangeMin,
            rangeMax,
        });
    }, [tab, product.id, layer, colormap, rangeMin, rangeMax]);

    const mapRaster = useMemo<MapRasterOverlay | null>(() => {
        if (tab !== 'results' || !rasterSrc) return null;
        return {
            src: rasterSrc,
            extent: productExtent(product.id),
            opacity: opacity / 100,
        };
    }, [tab, rasterSrc, product.id, opacity]);

    // 결과 탭에 들어오거나 산출물을 바꾸면 지도 뷰를 그 산출물에 맞춰 zoom-fit.
    useEffect(() => {
        if (tab !== 'results') return;
        setFitKey(`fit-product-${product.id}-${Date.now()}`);
    }, [tab, product.id]);

    /** 지도 우상단 범례 외관 — 현재 layer/colormap/range 와 동기화. */
    const mapLegend = useMemo<MapVelocityLegend | undefined>(() => {
        if (tab !== 'results') return undefined;
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
    }, [tab, layer, colormap, rangeMin, rangeMax]);

    // 미리보기 중에는 폼에서 파생된 AOI 대신 호버 중인 저장 AOI 를 표시. 풋프린트도 임시로 비움.
    const mapAoi = previewAoi
        ? aoiToRing(previewAoi)
        : tab === 'request'
            ? requestAoi
            : null;
    const mapFootprints = previewAoi || tab !== 'request' ? [] : requestFootprints;
    const mapPointsList = tab === 'results' ? resultsPoints : [];
    const mapOnClick = tab === 'results' ? (coord: [number, number]) => addPointAt(coord[0], coord[1]) : undefined;

    // ── 요청 모드: 지도에서 AOI 그리기/편집 ───────────────────────────────
    /** 폴리곤 ring 으로부터 bbox 를 구해 form 의 NW/SE 좌표 4개를 갱신. */
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
        // AOI 를 새로 잡으면 기존 scene 선택은 의미 없으므로 초기화.
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

    // ── 결과 모드: 점 시계열 ─────────────────────────────────────────────
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

    // ── 요청 모드: 폼 조작/제출 ─────────────────────────────────────────
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
        // DInSAR 로 전환 시 선택을 2개 초과면 잘라낸다.
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
            setTab('results');
        }, 700);
    };
    const resetRequest = () => {
        setRequest(buildDefaultRequest());
        setSelectedSceneIds(new Set());
        toast('요청 폼 초기화됨');
    };

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <PageHeader breadcrumb={['홈', 'InSAR 분석']} />
            <div className="split" style={{ flex: 1 }}>
                <aside
                    className="split__side split__side--left"
                    style={{ width: 320, display: 'flex', flexDirection: 'column' }}
                >
                    <SidebarTabs tab={tab} onChange={setTab} />
                    {tab === 'request' ? (
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
                        />
                    ) : (
                        <ResultsSidebar
                            products={filteredProducts}
                            allCount={PRODUCTS.length}
                            typeFilter={typeFilter}
                            onTypeFilter={setTypeFilter}
                            selected={selected}
                            onSelect={(id) => {
                                if (id === selected) return;
                                setSelected(id);
                                // 다른 산출물의 시계열 점은 위치가 새 분석 영역과 무관하므로 초기화.
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
                            onRangeMinChange={setRangeMin}
                            onRangeMaxChange={setRangeMax}
                            currentProduct={product}
                            onShowScenes={() => setShowScenes(true)}
                            onDownload={() =>
                                toast(`${product.name} 다운로드 시작`, { tone: 'success' })
                            }
                            points={points}
                            onClearPoints={clearPoints}
                            onRemovePoint={removePoint}
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
                            points={mapPointsList}
                            raster={mapRaster}
                            onMapClick={mapOnClick}
                            showLegend={tab === 'results'}
                            legend="velocity"
                            legendOptions={mapLegend}
                            tools={tab === 'request' ? ['bbox'] : []}
                            activeTool={tab === 'request' ? activeTool : undefined}
                            onToolSelect={tab === 'request' ? setActiveTool : undefined}
                            onDrawEnd={tab === 'request' ? handleMapDrawEnd : undefined}
                            // preview 중에는 사용자가 지도에서 AOI 를 드래그/리사이즈해도 무시 — 호버를 떼면 본 AOI 로 복귀.
                            onAoiChange={tab === 'request' && !previewAoi ? handleMapAoiEdit : undefined}
                            fitKey={fitKey}
                        >
                            {tab === 'request' ? (
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
                            ) : (
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
                            )}
                            {tab === 'request' && activeTool === 'bbox' ? (
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
                        {/* scene 가져오기 로딩 오버레이 — 검색 페이지와 동일 패턴, request 탭에서만. */}
                        <div
                            aria-live="polite"
                            aria-hidden={!(tab === 'request' && fetchingScenes)}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(15, 18, 22, 0.45)',
                                backdropFilter:
                                    tab === 'request' && fetchingScenes ? 'blur(2px)' : 'blur(0px)',
                                zIndex: 10,
                                opacity: tab === 'request' && fetchingScenes ? 1 : 0,
                                pointerEvents: tab === 'request' && fetchingScenes ? 'all' : 'none',
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
                        {/* scene 선택 패널 (request 탭) — 우측에서 슬라이드, 닫혔을 땐 토글 버튼만 노출. */}
                        {tab === 'request' ? (
                            <>
                                {!pickerOpen ? (
                                    <button
                                        type="button"
                                        onClick={() => setPickerOpen(true)}
                                        style={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            zIndex: 7,
                                            padding: '8px 12px',
                                            background: 'var(--bg-2)',
                                            border: '1px solid var(--border-default)',
                                            borderRadius: 6,
                                            fontSize: 12.5,
                                            fontWeight: 500,
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            boxShadow: 'var(--shadow-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        <Icon name="chart" size={13} />
                                        scene 선택{' '}
                                        <span
                                            className="mono tabular"
                                            style={{
                                                color:
                                                    selectedSceneIds.size >=
                                                    ANALYSIS_META[request.type].minScenes
                                                        ? 'var(--success)'
                                                        : 'var(--text-secondary)',
                                            }}
                                        >
                                            {selectedSceneIds.size}/{ANALYSIS_META[request.type].minScenes}
                                        </span>
                                    </button>
                                ) : null}
                                <ScenePickerPanel
                                    open={pickerOpen}
                                    onClose={() => setPickerOpen(false)}
                                    scenes={availableScenes}
                                    selected={selectedSceneIds}
                                    onToggle={toggleSceneSelection}
                                    onSelectAll={selectAllScenes}
                                    onClear={clearSelectedScenes}
                                    analysisType={request.type}
                                    hoveredId={hoveredSceneId}
                                    onHover={setHoveredSceneId}
                                    fetching={fetchingScenes}
                                />
                            </>
                        ) : null}
                    </div>

                    <div
                        style={{
                            // request 모드는 타임라인 콘텐츠에 딱 맞춰 높이가 결정되도록
                            // height 를 auto 로 두고, results 모드만 차트 공간을 위해 260px 고정.
                            ...(tab === 'request' ? {} : { height: 260 }),
                            flexShrink: 0,
                            borderTop: '1px solid var(--border-subtle)',
                            background: 'var(--bg-2)',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            zIndex: 9,
                        }}
                    >
                        {tab === 'request' ? (
                            <RequestTimelinePanel
                                rangeStart={request.startDate}
                                rangeEnd={request.endDate}
                                onRangeChange={(s, e) =>
                                    setRequest((f) => ({ ...f, startDate: s, endDate: e }))
                                }
                            />
                        ) : (
                            <ResultsBottomPanel
                                points={points}
                                onExport={exportCsv}
                            />
                        )}
                    </div>
                </div>
            </div>
            {showScenes && tab === 'results' ? (
                <ScenesModal product={product} onClose={() => setShowScenes(false)} />
            ) : null}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 사이드바 탭
// ────────────────────────────────────────────────────────────────────────────

function SidebarTabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
    const items: [Tab, string][] = [
        ['request', '분석 요청'],
        ['results', '결과'],
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
            {items.map(([k, label]) => {
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
                        }}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 분석 요청 — 사이드바 (폼)
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
}: RequestSidebarProps) {
    const minSel = ANALYSIS_META[form.type].minScenes;
    const ready = selectedCount >= minSel;
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
                            />
                            <div className="faint" style={{ fontSize: 11, lineHeight: 1.5 }}>
                                Master/Slave 쌍은 아래 타임라인에서 직접 두 scene 을 선택하세요.
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
                                ['mean_velocity', 'mean_velocity', 'mm/yr'],
                                ['coherence', 'coherence', '0–1'],
                                ['cumulative_disp', 'cumulative_disp', 'mm'],
                                ['wrapped_phase', 'wrapped_phase', 'rad'],
                            ] as const
                        ).map(([k, label, unit]) => {
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
                                    <span className="faint" style={{ fontSize: 11, marginLeft: 'auto' }}>
                                        {unit}
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
                <div
                    className="between"
                    style={{ marginBottom: 8, fontSize: 11.5 }}
                >
                    <span className="faint">
                        scene 선택 <span className="mono tabular" style={{ color: ready ? 'var(--success)' : 'var(--text-secondary)' }}>
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
    onRangeMinChange: (n: number) => void;
    onRangeMaxChange: (n: number) => void;
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
    onRangeMinChange,
    onRangeMaxChange,
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
                            </div>
                        ))
                    )}
                </div>

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

                <Section title={`범위 (${LAYER_META[layer].unit})`}>
                    <div className="input-group">
                        <input
                            className="input mono tabular"
                            type="number"
                            value={rangeMin}
                            onChange={(e) => onRangeMinChange(+e.target.value)}
                        />
                        <input
                            className="input mono tabular"
                            type="number"
                            value={rangeMax}
                            onChange={(e) => onRangeMaxChange(+e.target.value)}
                        />
                    </div>
                </Section>

                <Section
                    title={`투명도 — ${opacity}%`}
                >
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
// 폼/사이드바 공용 헬퍼
// ────────────────────────────────────────────────────────────────────────────

function Section({
    title,
    hint,
    children,
}: {
    title: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--border-subtle)',
            }}
        >
            <div className="col" style={{ gap: 2, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{title}</span>
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
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    max?: number;
    hint?: string;
}) {
    return (
        <div className="col" style={{ gap: 3 }}>
            <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11.5, flex: 1 }}>{label}</span>
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
// 결과 — 시계열 차트
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
// baseline 도움말 — 처음 InSAR 를 보는 사용자를 위한 ⓘ 위젯
// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// 수식 렌더링 — KaTeX 의존 없이 LaTeX 스타일을 흉내내는 가벼운 헬퍼.
// 변수: serif italic, subscript: <sub>(축소 + roman), 디스플레이: 가운데 정렬 + 배경.
// ────────────────────────────────────────────────────────────────────────────

const MATH_FONT =
    '"Cambria Math", "STIX Two Math", "Latin Modern Math", "Times New Roman", serif';

function MEq({
    display,
    children,
}: {
    display?: boolean;
    children: React.ReactNode;
}) {
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

/** 수학적 변수 — italic serif. 예: <MV>B</MV>, <MV>X</MV> */
function MV({ children }: { children: React.ReactNode }) {
    return <span style={{ fontStyle: 'italic' }}>{children}</span>;
}

/** 수학 subscript — roman, 축소. 예: B<MSub>⊥</MSub> */
function MSub({ children }: { children: React.ReactNode }) {
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
        // 패널은 우측 가장자리에 있으므로, popover 가 화면 밖으로 나가지 않도록 좌측 정렬.
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
                              style={{
                                  alignItems: 'center',
                                  padding: '10px 14px 8px',
                                  flexShrink: 0,
                              }}
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
                                              color: active
                                                  ? 'var(--accent)'
                                                  : 'var(--text-secondary)',
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
                          <div
                              role="tabpanel"
                              style={{
                                  padding: '12px 14px',
                                  overflow: 'auto',
                                  minHeight: 0,
                              }}
                          >
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
                두 SAR 촬영 시점의 위성 위치 차이를 시선(LOS) 직각 방향으로 투영한
                길이입니다. 간섭쌍(InSAR) 의 품질을 결정하는 핵심 파라미터예요.
            </p>
            <MEq display>
                <MV>B</MV>
                <MSub>⊥</MSub> = | <MV>B</MV> − ( <MV>B</MV> · <MV>r̂</MV> ) <MV>r̂</MV>{' '}
                |
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
                <li>
                    부호 ( <MEq>+</MEq> / <MEq>−</MEq> ): 위성이 LOS 직각 어느
                    쪽에 있는지의 방향
                </li>
            </ul>
            <div
                style={{
                    paddingTop: 8,
                    borderTop: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: 10.5,
                }}
            >
                각 scene 행의{' '}
                <span className="mono" style={{ color: 'var(--text-primary)' }}>
                    ⊥+147m
                </span>{' '}
                는 stack 의 reference scene 으로부터의{' '}
                <MEq>
                    <MV>B</MV>
                    <MSub>⊥</MSub>
                </MEq>{' '}
                입니다 (모든 분석 유형 공통).
            </div>
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
            <div
                style={{
                    fontSize: 10.5,
                    color: 'var(--text-tertiary)',
                    margin: '-2px 0 8px 0',
                    textAlign: 'center',
                }}
            >
                <MV>M</MV> = master, <MV>S</MV> = slave
            </div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>품질 임계값</div>
            <ul style={{ margin: '0 0 8px 0', paddingLeft: 16 }}>
                <li>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                        양호
                    </span>{' '}
                    (&lt; 150 m): coherence 우수, 변위 분석 추천
                </li>
                <li>
                    <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                        경계
                    </span>{' '}
                    (150 ~ 250 m): 사용 가능, 결과 노이즈 증가
                </li>
                <li>
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                        위험
                    </span>{' '}
                    (&gt; 250 m): coherence 저하, 신뢰도 낮음
                </li>
            </ul>
            <div
                style={{
                    paddingTop: 8,
                    borderTop: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: 10.5,
                }}
            >
                DInSAR 는 페어 1개로 끝나므로 이 단일 수치가 곧 분석 품질입니다.
                Sentinel-1 은 12일 cadence 기준 보통{' '}
                <MEq>
                    | <MV>B</MV>
                    <MSub>⊥</MSub> | &lt; 150 m
                </MEq>{' '}
                페어가 대부분이에요.
            </div>
        </>
    );
}

function BaselineTabStack() {
    return (
        <>
            <p style={{ margin: '0 0 8px 0' }}>
                SBAS/PSInSAR 는 페어가 1개가 아니라 <strong>여러 페어로 짠 네트워크</strong>
                라 단일 수치로 평가가 안 됩니다. 그래서 선택한 <MV>N</MV>장의{' '}
                <MEq>
                    | <MV>B</MV>
                    <MSub>⊥</MSub> |
                </MEq>{' '}
                분포를 통계로 요약합니다.
            </p>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>지표 의미</div>
            <ul style={{ margin: '0 0 8px 0', paddingLeft: 16 }}>
                <li>
                    <MEq>
                        min<sub style={{ fontStyle: 'normal', fontSize: '0.72em' }}>
                            i
                        </sub>{' '}
                        | <MV>B</MV>
                        <MSub>⊥, i</MSub> |
                    </MEq>{' '}
                    — 가장 작은 절댓값. 가장 안정한 페어 후보.
                </li>
                <li>
                    <MEq>
                        ⟨ | <MV>B</MV>
                        <MSub>⊥</MSub> | ⟩
                    </MEq>{' '}
                    — 평균. 스택 전반의 baseline 분포 중심.
                </li>
                <li>
                    <MEq>
                        max<sub style={{ fontStyle: 'normal', fontSize: '0.72em' }}>
                            i
                        </sub>{' '}
                        | <MV>B</MV>
                        <MSub>⊥, i</MSub> |
                    </MEq>{' '}
                    — 가장 큰 절댓값. 가장 risky 한 페어 (제외 후보).
                </li>
            </ul>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>실제 처리 흐름</div>
            <ul style={{ margin: '0 0 8px 0', paddingLeft: 16 }}>
                <li>
                    <strong>SBAS</strong>:{' '}
                    <MEq>
                        | <MV>B</MV>
                        <MSub>⊥</MSub> | &lt; <MV>B</MV>
                        <MSub>th</MSub>
                    </MEq>{' '}
                    (보통 150 m) 인 페어들로 small-baseline 네트워크 구성 → 시계열 추정
                </li>
                <li>
                    <strong>PSInSAR</strong>: 단일 master 와 모든 secondary 를 페어로
                    묶음 →{' '}
                    <MEq>
                        max | <MV>B</MV>
                        <MSub>⊥</MSub> |
                    </MEq>{' '}
                    가 분석 한계를 결정
                </li>
            </ul>
            <div
                style={{
                    paddingTop: 8,
                    borderTop: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: 10.5,
                }}
            >
                요약하면 <MEq>min</MEq> 이 작고 <MEq>max</MEq> 가 너무 크지 않은
                (이상적으로{' '}
                <MEq>
                    ⟨ | <MV>B</MV>
                    <MSub>⊥</MSub> | ⟩ &lt; 100 m
                </MEq>
                ) 스택이 좋은 후보입니다.
            </div>
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
                는 SLC 픽셀 처리 전, ESA 의 <strong>정밀 궤도 (POEORB)</strong>{' '}
                메타데이터만으로 산출 가능합니다.
            </p>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>POEORB 사양</div>
            <ul style={{ margin: '0 0 8px 0', paddingLeft: 16 }}>
                <li>정확도: ±5 cm (위성 위치)</li>
                <li>가용 시점: 촬영 후 ~20일 (실시간 시 RESORB ±10 cm 대체)</li>
                <li>파일 크기: 수백 KB (SLC 는 GB 단위)</li>
            </ul>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>계산 흐름</div>
            <ol style={{ margin: '0 0 8px 0', paddingLeft: 16 }}>
                <li>
                    두 scene 의 acquisition time{' '}
                    <MEq>
                        <MV>t</MV>
                        <MSub>M</MSub>, <MV>t</MV>
                        <MSub>S</MSub>
                    </MEq>{' '}
                    에서 위성 state vector 보간
                </li>
                <li>
                    AOI 중심 <MV>P</MV> 에 대해 zero-Doppler time 산출
                </li>
                <li>
                    baseline 벡터:
                    <MEq display>
                        <MV>B</MV> = <MV>X</MV>
                        <MSub>S</MSub> − <MV>X</MV>
                        <MSub>M</MSub>
                    </MEq>
                </li>
                <li>
                    LOS 단위벡터{' '}
                    <MEq>
                        <MV>r̂</MV> = ( <MV>P</MV> − <MV>X</MV>
                        <MSub>M</MSub> ) / | <MV>P</MV> − <MV>X</MV>
                        <MSub>M</MSub> |
                    </MEq>{' '}
                    로 직각 성분 투영 →{' '}
                    <MEq>
                        <MV>B</MV>
                        <MSub>⊥</MSub>
                    </MEq>
                </li>
            </ol>
            <div
                style={{
                    paddingTop: 8,
                    borderTop: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: 10.5,
                }}
            >
                전체 SLC 스택을 다운로드하지 않고도 페어링 적합성을 미리 판단할 수
                있어, 실패할 페어에 대한 다운로드/처리 비용을 절감합니다.
            </div>
        </>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 결과 — 원본 scene 모달
// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// 분석 요청 — 우측 슬라이드 패널 (scene 목록 + 미리보기 + 다중 선택)
// ────────────────────────────────────────────────────────────────────────────

interface ScenePickerPanelProps {
    open: boolean;
    onClose: () => void;
    scenes: AvailableScene[];
    selected: Set<string>;
    onToggle: (id: string) => void;
    onSelectAll: () => void;
    onClear: () => void;
    analysisType: AnalysisType;
    hoveredId: string | null;
    onHover: (id: string | null) => void;
    fetching: boolean;
}

function ScenePickerPanel({
    open,
    onClose,
    scenes,
    selected,
    onToggle,
    onSelectAll,
    onClear,
    analysisType,
    hoveredId,
    onHover,
    fetching,
}: ScenePickerPanelProps) {
    const minScenes = ANALYSIS_META[analysisType].minScenes;
    const ready = selected.size >= minScenes;
    const requirement = ANALYSIS_META[analysisType].sceneRequirement;
    const allSelected =
        analysisType === 'DInSAR'
            ? selected.size === 2 && scenes.length >= 2
            : scenes.length > 0 && selected.size >= scenes.length;

    // 선택된 scene 들의 baseline 통계 — 사전계산된 B⊥ 로부터 페어/스택 요약.
    const baselineSummary = useMemo(() => {
        if (selected.size < 2) return null;
        const picks = scenes.filter((s) => selected.has(s.id));
        if (picks.length < 2) return null;
        const perps = picks.map((s) => s.perpBaseline);
        if (analysisType === 'DInSAR' && picks.length === 2) {
            // 두 scene 의 baseline 차이가 페어 B⊥
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
            aria-hidden={!open}
            style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: 360,
                background: 'var(--bg-1)',
                borderLeft: '1px solid var(--border-default)',
                boxShadow: open ? 'var(--shadow-md)' : 'none',
                zIndex: 8,
                transform: open ? 'translateX(0)' : 'translateX(calc(100% + 4px))',
                transition: 'transform 220ms cubic-bezier(0.2, 0.7, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                pointerEvents: open ? 'all' : 'none',
            }}
        >
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
                        <span
                            className={`badge ${typeBadge(analysisType)}`}
                            style={{ fontSize: 10 }}
                        >
                            {analysisType}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={onClose}
                        aria-label="패널 닫기"
                        style={{ width: 24, height: 24, padding: 0 }}
                    >
                        <Icon name="x" size={13} />
                    </button>
                </div>
                <div
                    className="row gap-2"
                    style={{ alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}
                >
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
                <div
                    className="faint"
                    style={{ fontSize: 10.5, marginTop: 4, lineHeight: 1.45 }}
                >
                    {scenes.length}개 가용
                    {analysisType === 'DInSAR'
                        ? ' · 두 scene 선택 시 master/slave 자동 매칭'
                        : ''}
                </div>

                {/* B⊥ 사전계산 워크플로우 indicator + 도움말 */}
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
                    <div
                        className="row gap-2"
                        style={{ alignItems: 'center', fontSize: 10.5 }}
                    >
                        <Icon
                            name="satellite"
                            size={11}
                            style={{ color: 'var(--success)' }}
                        />
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
                            // 항상 렌더링하여 선택 변경 시 레이아웃 시프트 방지.
                            // baselineSummary 가 null 인 경우엔 placeholder 만 표시.
                        }}
                    >
                        {baselineSummary ? (
                            baselineSummary.mode === 'pair' ? (
                                <>
                                    <span style={{ color: 'var(--text-tertiary)' }}>
                                        페어 B⊥
                                    </span>{' '}
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
                                    <span style={{ color: 'var(--text-tertiary)' }}>
                                        스택 |B⊥|
                                    </span>{' '}
                                    min {baselineSummary.min} · mean{' '}
                                    {baselineSummary.mean} · max {baselineSummary.max} m
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
                        const order = isSel
                            ? Array.from(selected).indexOf(s.id) + 1
                            : null;
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
                                    <Quicklook sceneId={s.id} size={48} />
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
                                            title="perpendicular baseline (수직 baseline) — 두 SAR scene 의 시선(LOS) 직각 방향 거리. 절댓값이 작을수록 간섭 coherence 가 좋다."
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
                                            fontSize: 11,
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
                {/*
                 * 패널 내부 로딩 spinner 는 의도적으로 두지 않는다.
                 * 지도 영역에 absolute 로 깔린 fetchingScenes 오버레이가 패널 영역까지
                 * 덮으므로, 같은 자리에 spinner 두 개가 겹쳐 보이는 것을 방지.
                 * fetching prop 은 위에서 "scene 없음" 빈 상태 메시지를 억제하는 데만 사용.
                 */}
            </div>

            <div
                style={{
                    padding: 10,
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
                    {analysisType === 'DInSAR'
                        ? '첫/마지막 페어'
                        : `전체 (${scenes.length})`}
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
                                    <Quicklook sceneId={s.id} size={42} />
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
