/**
 * 저장된 AOI 라이브러리 Current 서비스 v1 — 실제 API 연동 자리
 *
 * ⚠️ 백엔드 연결은 프론트 리팩토링 마무리 후 진행 예정.
 * 지금은 Plan 의 Context/UI 를 그대로 재사용할 수 있도록 계약(IAoisService)만
 * 충족하는 스텁이다. 각 메서드는 추후 `/api/sar/user/aois` BFF 라우트로 교체한다.
 *
 * BFF 연동 시 교체 지점:
 *   - AOI_목록을_조회한다 → GET    /api/sar/user/aois
 *   - AOI를_등록한다      → POST   /api/sar/user/aois
 *   - AOI를_수정한다      → PATCH  /api/sar/user/aois/{id}
 *   - AOI를_삭제한다      → DELETE /api/sar/user/aois/{id}
 */
import type { IAoisService } from '@/app/(planning)/plan/(sar)/sar/user/aois/_services/aois.service.interface';

const NOT_CONNECTED = '백엔드 미연결: AOI API 는 리팩토링 완료 후 연결됩니다.';

export const aoisCurrentServiceV1: IAoisService = {
    async AOI_목록을_조회한다() {
        return { success: false, message: NOT_CONNECTED, data: { aois: [] } };
    },

    async AOI를_등록한다() {
        return { success: false, message: NOT_CONNECTED };
    },

    async AOI를_수정한다() {
        return { success: false, message: NOT_CONNECTED };
    },

    async AOI를_삭제한다() {
        return { success: false, message: NOT_CONNECTED };
    },
};
