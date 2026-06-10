import type { InsarRequestUI } from '../../../_mocks/insar-request.ui-interface';

/**
 * SWR 키 팩토리 — 가용 scene 카탈로그·기법 적합도는 (AOI + 기간 + 미션) 조합으로 캐싱한다.
 * 키가 바뀌면 SWR 이 자동으로 재조회하므로, 결과는 useState 로 들지 않는다.
 *
 * Date 는 getTime() 으로 직렬화해 동일 조건에서 키가 일치하도록 한다.
 */
export function createAvailableScenesKey(params: InsarRequestUI.AvailableScenesParams) {
    return [
        'insar-request',
        'available-scenes',
        params.nwLat,
        params.nwLon,
        params.seLat,
        params.seLon,
        params.startDate.getTime(),
        params.endDate.getTime(),
        params.platform,
        params.s1a,
        params.s1c,
    ] as const;
}

export function createAssessKey(params: InsarRequestUI.AssessParams) {
    return [
        'insar-request',
        'assess-methods',
        params.nwLat,
        params.nwLon,
        params.seLat,
        params.seLon,
        params.startDate.getTime(),
        params.endDate.getTime(),
    ] as const;
}
