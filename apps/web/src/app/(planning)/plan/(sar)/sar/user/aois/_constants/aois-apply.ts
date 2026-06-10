import type { AoisUI } from '../_mocks/aois.ui-interface';

/** AOI 적용 대상 — 검색 / InSAR 요청 */
export type ApplyTarget = 'search' | 'insar';

/** 적용 대상 → 이동할 경로 */
export const APPLY_TARGET_PATH: Record<ApplyTarget, string> = {
    search: '/plan/sar/user/search',
    insar: '/plan/sar/user/insar/request',
};

/** 저장된 AOI 를 GeoJSON ring([lon,lat] 5점, 시작점=종료점)으로 변환. */
export function aoiToRing(a: AoisUI.Aoi): Array<[number, number]> {
    return [
        [a.nwLon, a.nwLat],
        [a.seLon, a.nwLat],
        [a.seLon, a.seLat],
        [a.nwLon, a.seLat],
        [a.nwLon, a.nwLat],
    ];
}

/** AOI 폴리곤(ring, [lon,lat])을 직사각형 bbox 로 변환. 비스듬해도 bbox 로 정규화. */
export function aoiRingToBounds(ring: Array<[number, number]>): AoisUI.AoiBounds | null {
    if (!ring || ring.length < 3) return null;
    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }
    if (!Number.isFinite(minLon)) return null;
    return { nwLat: maxLat, nwLon: minLon, seLat: minLat, seLon: maxLon };
}
