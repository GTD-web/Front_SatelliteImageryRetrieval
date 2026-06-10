/**
 * InSAR 분석 요청 Current 서비스 v1 — 실제 API 연동 자리
 *
 * ⚠️ 백엔드 연결은 프론트 리팩토링 마무리 후 진행 예정.
 * 지금은 Plan 의 Context/UI 를 그대로 재사용할 수 있도록 계약(IInsarRequestService)만
 * 충족하는 스텁이다. 각 메서드는 추후 `/api/sar/user/insar/request` BFF 라우트로 교체한다.
 *
 * BFF 연동 시 교체 지점:
 *   - 가용_씬을_조회한다   → GET  /api/sar/user/insar/request/scenes   (AOI/기간/미션 쿼리)
 *   - 기법_적합도를_평가한다 → POST /api/sar/user/insar/request/assess   (AOI/기간)
 *   - InSAR_요청을_제출한다  → POST /api/sar/user/insar/request          (폼 + scene id)
 */
import type { IInsarRequestService } from '@/app/(planning)/plan/(sar)/sar/user/insar/request/_services/insar-request.service.interface';

const NOT_CONNECTED = '백엔드 미연결: InSAR 요청 API 는 리팩토링 완료 후 연결됩니다.';

export const insarRequestCurrentServiceV1: IInsarRequestService = {
    async 가용_씬을_조회한다() {
        return {
            success: false,
            message: NOT_CONNECTED,
            data: [],
        };
    },

    async 기법_적합도를_평가한다() {
        return {
            success: false,
            message: NOT_CONNECTED,
            data: [],
        };
    },

    async InSAR_요청을_제출한다() {
        return {
            success: false,
            message: NOT_CONNECTED,
            data: { requestId: '', type: 'DInSAR', sceneCount: 0 },
        };
    },
};
