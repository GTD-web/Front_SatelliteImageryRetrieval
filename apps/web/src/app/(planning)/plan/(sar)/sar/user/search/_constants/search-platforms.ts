import type { SearchUI } from '../_mocks/search.ui-interface';

/** 검색 가능한 위성 플랫폼 목록. ready=false 는 연동 준비 중. */
export const PLATFORMS: SearchUI.PlatformDef[] = [
    { value: 'S1', label: 'Sentinel-1 (SAR)', kind: 'SAR', ready: true },
    { value: 'S2', label: 'Sentinel-2 (광학)', kind: 'EO', ready: true, note: '광학 필터 미리보기' },
    { value: 'nisar', label: 'NISAR (L/S-band SAR)', kind: 'SAR', ready: true },
    { value: 'umbra', label: 'Umbra (SAR)', kind: 'SAR', ready: false, note: '연동 준비 중' },
    { value: 'capella', label: 'Capella (SAR)', kind: 'SAR', ready: false, note: '연동 준비 중' },
    { value: 'kompsat', label: 'KOMPSAT (광학/SAR)', kind: 'EO', ready: false, note: '연동 준비 중' },
];

/** Sentinel-1 편광 옵션. */
export const S1_POLS = ['VV', 'VH', 'HH', 'HV', 'VV+VH'];

/** 날짜 프리셋 칩 라벨. */
export const DATE_PRESETS = ['1주', '1개월', '3개월', '1년'] as const;

/** NISAR 주파수 밴드 정의. */
export const NISAR_BANDS: Array<{ key: string; label: string; desc: string }> = [
    { key: 'L', label: 'L-band (24cm)', desc: '장파장 · 식생 투과 · 대변위 · InSAR 주력' },
    { key: 'S', label: 'S-band (12cm)', desc: '단파장 · 농작물·습지 등 변화 탐지' },
];

/** NISAR 편광 모드. single/dual/quad/compact 조합. */
export const NISAR_POLS = ['HH', 'VV', 'HH+HV', 'VV+VH', 'HH+HV+VH+VV', 'RH+RV'];

/** Sentinel-2 밴드 정의. */
export const S2_BANDS: Array<{ key: string; label: string; desc: string }> = [
    { key: 'TCI', label: 'TCI (트루컬러)', desc: 'B04/B03/B02 합성 미리보기' },
    { key: 'B08', label: 'B08 (NIR)', desc: '근적외 · 식생 분석' },
    { key: 'B11', label: 'B11 (SWIR1)', desc: '단파적외 · 산불·습도' },
    { key: 'B12', label: 'B12 (SWIR2)', desc: '단파적외 · 광물 탐사' },
];

/** Sentinel-2 구름 비율 프리셋 칩. */
export const S2_CLOUD_PRESETS = [10, 20, 30, 50, 100];
