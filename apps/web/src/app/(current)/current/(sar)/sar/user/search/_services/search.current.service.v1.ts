/**
 * Scene 검색 Current 서비스 v1 — 실제 API 연동 자리
 *
 * ⚠️ 백엔드 연결은 프론트 리팩토링 마무리 후 진행 예정.
 * 지금은 Plan 의 Context/UI 를 그대로 재사용할 수 있도록 계약(ISearchService)만
 * 충족하는 스텁이다. 각 메서드는 추후 `/api/sar/user/search` BFF 라우트로 교체한다.
 *
 * BFF 연동 시 교체 지점:
 *   - 씬을_검색한다 → GET /api/sar/user/search/scenes (플랫폼/필터/검색어 쿼리)
 */
import type { ISearchService } from '@/app/(planning)/plan/(sar)/sar/user/search/_services/search.service.interface';

const NOT_CONNECTED = '백엔드 미연결: 검색 API 는 리팩토링 완료 후 연결됩니다.';

export const searchCurrentServiceV1: ISearchService = {
    async 씬을_검색한다() {
        return {
            success: false,
            message: NOT_CONNECTED,
            data: { scenes: [], facetCounts: {} },
        };
    },
};
