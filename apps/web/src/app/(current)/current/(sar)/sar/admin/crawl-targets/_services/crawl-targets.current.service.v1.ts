/**
 * 크롤 대상(AOI) Current 서비스 v1 — 실제 API 연동 자리
 *
 * ⚠️ 백엔드 연결은 프론트 리팩토링 마무리 후 진행 예정.
 * 지금은 Plan 의 Context/UI 를 그대로 재사용할 수 있도록 계약(ICrawlTargetsService)만
 * 충족하는 스텁이다. 각 메서드는 추후 `/api/sar/admin/crawl-targets` BFF 라우트로 교체한다.
 *
 * BFF 연동 시 교체 지점:
 *   - AOI_목록을_조회한다 → GET  /api/sar/admin/crawl-targets
 *   - AOI를_크롤한다      → POST /api/sar/admin/crawl-targets/{name}/crawl
 *   - AOI를_생성한다      → POST /api/sar/admin/crawl-targets
 */
import type { ICrawlTargetsService } from '@/app/(planning)/plan/(sar)/sar/admin/crawl-targets/_services/crawl-targets.service.interface';

const NOT_CONNECTED = '백엔드 미연결: 크롤 대상 API 는 리팩토링 완료 후 연결됩니다.';

export const crawlTargetsCurrentServiceV1: ICrawlTargetsService = {
    async AOI_목록을_조회한다() {
        return { success: false, message: NOT_CONNECTED, data: { aois: [] } };
    },

    async AOI를_크롤한다(name) {
        return { success: false, message: `${NOT_CONNECTED} (${name})` };
    },

    async AOI를_생성한다() {
        return { success: false, message: NOT_CONNECTED };
    },
};
