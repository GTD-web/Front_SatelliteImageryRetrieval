/**
 * InSAR 결과 뷰어 Current 서비스 v1 — 실제 API 연동 자리
 *
 * ⚠️ 백엔드 연결은 프론트 리팩토링 마무리 후 진행 예정.
 * 지금은 Plan 의 Context/UI 를 그대로 재사용할 수 있도록 계약(IInsarResultsService)만
 * 충족하는 스텁이다. 각 메서드는 추후 `/api/sar/user/insar/results` BFF 라우트로 교체한다.
 *
 * BFF 연동 시 교체 지점:
 *   - 결과_데이터를_조회한다     → GET  /api/sar/user/insar/results
 *   - 산출물_다운로드를_요청한다 → POST /api/sar/user/insar/results/{productId}/download
 */
import type { IInsarResultsService } from '@/app/(planning)/plan/(sar)/sar/user/insar/results/_services/insar-results.service.interface';

const NOT_CONNECTED = '백엔드 미연결: InSAR 결과 API 는 리팩토링 완료 후 연결됩니다.';

export const insarResultsCurrentServiceV1: IInsarResultsService = {
    async 결과_데이터를_조회한다() {
        return {
            success: false,
            message: NOT_CONNECTED,
            data: { products: [] },
        };
    },

    async 산출물_다운로드를_요청한다(productId) {
        return { success: false, message: `${NOT_CONNECTED} (${productId})` };
    },
};
