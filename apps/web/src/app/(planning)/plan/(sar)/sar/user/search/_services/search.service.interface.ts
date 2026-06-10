import type { SearchUI } from '../_mocks/search.ui-interface';

/**
 * Scene 검색 UI 서비스 (Plan / Current 동일 인터페이스)
 *
 * Context 의 queries 는 이 계약에만 의존하며,
 * Plan(Mock) / Current(실제 API) 구현을 주입받아 환경을 분기한다.
 *
 * ⚠️ AOI 저장/불러오기는 이 서비스에 포함하지 않는다(공유 SavedAoisContext 담당).
 */
export interface ISearchService {
    씬을_검색한다(
        params: SearchUI.SearchParams,
    ): Promise<SearchUI.ServiceResponseWithData<SearchUI.SearchResult>>;
}
