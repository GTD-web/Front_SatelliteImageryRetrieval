/**
 * InSAR 요청 — 풋프린트/AOI 기하 헬퍼 (bbox 근사).
 */
import type { InsarRequestUI } from '../_mocks/insar-request.ui-interface';
import { PERP_WARN_M } from './insar-analysis';

type AvailableScene = InsarRequestUI.AvailableScene;

/**
 * 두 풋프린트(폴리곤 ring) 의 겹침 비율을 bbox 근사로 계산.
 * 결과 = (교집합 면적 / 더 작은 쪽 풋프린트 면적) × 100. 0 ~ 100.
 */
export function bboxOverlapPercent(
    a: Array<[number, number]>,
    b: Array<[number, number]>,
): number {
    if (!a.length || !b.length) return 0;
    const bb = (ring: Array<[number, number]>) => {
        let minLon = Infinity,
            maxLon = -Infinity,
            minLat = Infinity,
            maxLat = -Infinity;
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
export function computeFootprintsIntersection(
    footprints: Array<Array<[number, number]>>,
): Array<[number, number]> | null {
    if (footprints.length === 0) return null;
    let minLon = -Infinity,
        maxLon = Infinity,
        minLat = -Infinity,
        maxLat = Infinity;
    for (const fp of footprints) {
        if (!fp.length) return null;
        let fMinLon = Infinity,
            fMaxLon = -Infinity,
            fMinLat = Infinity,
            fMaxLat = -Infinity;
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

export function aoiCenter(aoi: Array<[number, number]> | null): [number, number] | null {
    if (!aoi || aoi.length < 3) return null;
    let minLon = Infinity,
        maxLon = -Infinity,
        minLat = Infinity,
        maxLat = -Infinity;
    for (const [lon, lat] of aoi) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }
    return [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
}

/** 기준(super-master) scene 대비 perpendicular baseline (m). 기준 자신은 0. */
export function relPerpBaseline(s: AvailableScene, refPerp: number): number {
    return s.perpBaseline - refPerp;
}

/** 기준 대비 |B⊥| 가 임계를 넘으면 불량일(기하 디코릴레이션 위험). */
export function isLowQualityScene(s: AvailableScene, refPerp: number): boolean {
    return Math.abs(relPerpBaseline(s, refPerp)) > PERP_WARN_M;
}

/**
 * 스택의 기준(super-master) scene id — perpBaseline 중앙값 scene 선택.
 * 실제 백엔드(GET /api/v1/baseline)에서는 정밀궤도 기반으로 계산해 내려준다.
 */
export function pickReferenceSceneId(scenes: AvailableScene[]): string | null {
    if (scenes.length === 0) return null;
    const sorted = [...scenes].sort((a, b) => a.perpBaseline - b.perpBaseline);
    return sorted[Math.floor(sorted.length / 2)]!.id;
}
