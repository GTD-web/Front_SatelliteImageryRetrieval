import type { InsarResultsUI } from '../_mocks/insar-results.ui-interface';

/** 시계열 점 색상 팔레트 (지도/차트 공용) */
export const POINT_COLORS = [
    '#dc2626',
    '#2563eb',
    '#10b981',
    '#f59e0b',
    '#a855f7',
    '#06b6d4',
    '#f472b6',
    '#84cc16',
];

/** 시계열 차트 X축 라벨 (12개월) */
export const TIMESERIES_DATES = [
    '25-10',
    '25-11',
    '25-12',
    '26-01',
    '26-02',
    '26-03',
    '26-04',
    '26-05',
    '26-06',
    '26-07',
    '26-08',
    '26-09',
];

/** 레이어 메타 — 단위/라벨 */
export const LAYER_META: Record<InsarResultsUI.Layer, { unit: string; label: string }> = {
    mean_velocity: { unit: 'mm/yr', label: 'mean_velocity' },
    coherence: { unit: '0–1', label: 'coherence' },
    cumulative_disp: { unit: 'mm', label: 'cumulative_disp' },
    wrapped_phase: { unit: 'rad', label: 'wrapped_phase' },
};

/** 레이어 전환 시 범위 입력을 단위에 맞춰 자동 재설정한다. */
export const LAYER_DEFAULT_RANGE: Record<InsarResultsUI.Layer, [number, number]> = {
    mean_velocity: [-30, 30],
    coherence: [0, 1],
    cumulative_disp: [-50, 50],
    wrapped_phase: [-3.14, 3.14],
};

/** 컬러맵별 CSS 그라디언트 (지도 범례 위젯용) */
export const COLORMAP_GRADIENTS: Record<InsarResultsUI.Colormap, string> = {
    RdBu: 'linear-gradient(to right, #2563eb, #60a5fa, #f1f5f9, #fb923c, #dc2626)',
    viridis: 'linear-gradient(to right, #440154, #3b528b, #21918c, #5ec962, #fde725)',
    magma: 'linear-gradient(to right, #000004, #51127c, #b73779, #fc8961, #fcfdbf)',
};

/** 지도 범례 위젯의 컬러맵 토글에 넘길 옵션 목록. */
export const COLORMAP_OPTIONS: ReadonlyArray<{ id: InsarResultsUI.Colormap; label: string }> = (
    ['RdBu', 'viridis', 'magma'] as const
).map((id) => ({ id, label: id }));

function hex(s: string): [number, number, number] {
    const v = parseInt(s.slice(1), 16);
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

/** 컬러맵별 RGB 스톱 (래스터 합성용) */
export const COLORMAP_STOPS: Record<InsarResultsUI.Colormap, Array<[number, number, number]>> = {
    RdBu: [hex('#2563eb'), hex('#60a5fa'), hex('#f1f5f9'), hex('#fb923c'), hex('#dc2626')],
    viridis: [hex('#440154'), hex('#3b528b'), hex('#21918c'), hex('#5ec962'), hex('#fde725')],
    magma: [hex('#000004'), hex('#51127c'), hex('#b73779'), hex('#fc8961'), hex('#fcfdbf')],
};

/** 산출물 중심 좌표 (lon, lat) — 지도 fit/raster 배치용 */
export const PRODUCT_CENTERS: Record<string, [number, number]> = {
    'pohang-q4': [129.37, 36.02],
    'gyeongju-sbas': [129.22, 35.85],
    gimhae: [128.88, 35.24],
    'busan-ps': [129.08, 35.18],
    ulleung: [130.9, 37.49],
    'daegu-ps': [128.6, 35.87],
    'andong-sbas': [128.73, 36.57],
    'mokpo-q1': [126.39, 34.81],
};

/** 지도 기본 중심 (산출물 미지정 시 폴백) */
export const DEFAULT_MAP_CENTER: [number, number] = [129.37, 36.02];
