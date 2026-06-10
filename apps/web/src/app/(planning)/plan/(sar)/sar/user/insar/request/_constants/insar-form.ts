/**
 * InSAR 요청 폼 상수/헬퍼 — 기본값, AOI 파싱, 기간 프리셋, 식생 phenology.
 */
import type { InsarRequestUI } from '../_mocks/insar-request.ui-interface';
import { AUTO_PARAMS } from './insar-analysis';

type RequestForm = InsarRequestUI.RequestForm;
type DatePreset = InsarRequestUI.DatePreset;

/** 오늘 기준 preset 범위를 계산해 [start, end]를 반환. (검색 페이지와 동일 동작) */
export function presetRange(preset: DatePreset): [Date, Date] {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    if (preset === '1주') start.setDate(end.getDate() - 7);
    else if (preset === '1개월') start.setMonth(end.getMonth() - 1);
    else if (preset === '3개월') start.setMonth(end.getMonth() - 3);
    else start.setFullYear(end.getFullYear() - 1);
    return [start, end];
}

export const DATE_PRESETS: DatePreset[] = ['1주', '1개월', '3개월', '1년'];

export function buildDefaultRequest(): RequestForm {
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
        platform: 'S1',
        s1a: true,
        s1c: false,
        ...AUTO_PARAMS.DInSAR,
        referenceMode: 'auto',
        referenceLon: '',
        referenceLat: '',
        datePreset: '',
    };
}

export function parseAoiFromForm(f: {
    nwLat: string;
    nwLon: string;
    seLat: string;
    seLon: string;
}): Array<[number, number]> | null {
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
 * scene 취득일의 식생 상태(한국 중부 기준 근사) — coherence "예측"용.
 * C-band coherence 의 지배 요인은 달력 간격이 아니라 두 시점의 식생 phenology 다.
 * leaf-out 전이기(4월 중순~5월 초)를 양쪽에서 가르거나 식생 상태가 다른 페어는
 * coherence 가 0.2 이하로 붕괴한다.
 */
export function vegState(isoDate: string): 'bare' | 'transition' | 'leaf' {
    const d = new Date(isoDate);
    const mmdd = (d.getMonth() + 1) * 100 + d.getDate();
    if (mmdd >= 410 && mmdd <= 505) return 'transition'; // leaf-out 전이기 (치명적)
    if (mmdd > 505 && mmdd <= 1031) return 'leaf'; // full-leaf (초여름~가을)
    return 'bare'; // 늦가을~초봄 (낙엽/겨울)
}
