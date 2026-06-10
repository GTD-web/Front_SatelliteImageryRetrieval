/**
 * Scene 검색 Planning Mock (클라이언트 메모리 카탈로그)
 *
 * 카탈로그는 기존 `@/app/(planning)/plan/_mocks/scenes` 의 MOCK_SCENES 를 그대로 재사용한다
 * (페이지에 인라인 데이터를 복제하지 않는다). 검색/필터/facet 집계만 여기서 수행.
 *
 * ⚠️ 저장된 AOI 는 검색 도메인에 들어오지 않는다(공유 SavedAoisContext 담당).
 */
import { MOCK_SCENES } from '@/app/(planning)/plan/_mocks/scenes';
import type { ISearchService } from '../_services/search.service.interface';
import { matchesQuery, sceneMatches } from '../_constants/search-filters';
import type { SearchUI } from './search.ui-interface';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 필터 칩에 표시할 facet count — 전체 카탈로그 기준 한 번 집계(불변). */
const FACET_COUNTS: Record<string, number> = (() => {
    const m: Record<string, number> = {};
    for (const s of MOCK_SCENES) {
        m[`mission:${s.mission}`] = (m[`mission:${s.mission}`] ?? 0) + 1;
        m[`product:${s.product}`] = (m[`product:${s.product}`] ?? 0) + 1;
        if (s.pol) m[`pol:${s.pol}`] = (m[`pol:${s.pol}`] ?? 0) + 1;
    }
    return m;
})();

export const mockSearchService: ISearchService = {
    async 씬을_검색한다(params) {
        // 검색 요청 시뮬레이션 — Context 가 오버레이("scene 검색 중…")를 띄울 시간.
        await delay(180);
        const { platform, filters, s2Filters, query } = params;
        const scenes = MOCK_SCENES.filter(
            (s) => matchesQuery(s, query) && sceneMatches(s, filters, platform, s2Filters),
        );
        return {
            success: true,
            message: `${scenes.length}개 scene 검색 결과`,
            data: { scenes, facetCounts: FACET_COUNTS } satisfies SearchUI.SearchResult,
        };
    },
};
