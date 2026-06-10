import type { SearchUI } from '../../../_mocks/search.ui-interface';

/**
 * SWR 키 팩토리 — 검색 결과는 (플랫폼 + 필터 + 검색어) 조합으로 캐싱한다.
 * 키가 바뀌면 SWR 이 자동으로 재검색하므로, 결과는 useState 로 들지 않는다.
 *
 * Date·배열 등은 안정적인 문자열로 직렬화해 동일 조건에서 키가 일치하도록 한다.
 */
export function createSceneSearchKey(params: SearchUI.SearchParams) {
    const { platform, filters: f, s2Filters: s2, query } = params;
    const filterSig = JSON.stringify({
        s1a: f.s1a,
        s1c: f.s1c,
        productMode: f.productMode,
        grd: f.grd,
        raw: f.raw,
        pol: [...f.pol].sort(),
        passA: f.passA,
        passD: f.passD,
        nisarBands: [...f.nisarBands].sort(),
        nisarProduct: f.nisarProduct,
        nisarPol: [...f.nisarPol].sort(),
        haveOnly: f.haveOnly,
        start: f.startDate.getTime(),
        end: f.endDate.getTime(),
    });
    const s2Sig = JSON.stringify({ level: s2.level, cloudMax: s2.cloudMax, bands: [...s2.bands].sort() });
    return ['user-search', 'scenes', platform, query, filterSig, s2Sig] as const;
}
