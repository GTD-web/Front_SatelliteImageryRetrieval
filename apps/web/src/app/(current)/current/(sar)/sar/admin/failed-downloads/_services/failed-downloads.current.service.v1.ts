/**
 * 실패한 다운로드 Current 서비스 v1 — 실제 API 연동 자리
 *
 * ⚠️ 백엔드 연결은 프론트 리팩토링 마무리 후 진행 예정.
 * 지금은 Plan 의 Context/UI 를 그대로 재사용할 수 있도록 계약(IFailedDownloadsService)만
 * 충족하는 스텁이다. 각 메서드는 추후 `/api/sar/admin/failed-downloads` BFF 라우트로 교체한다.
 *
 * BFF 연동 시 교체 지점:
 *   - 실패_다운로드_목록을_조회한다 → GET  /api/sar/admin/failed-downloads
 *   - 다운로드를_재시도한다         → POST /api/sar/admin/failed-downloads/{id}/retry
 *   - 다운로드를_무시한다           → POST /api/sar/admin/failed-downloads/{id}/dismiss
 */
import type { IFailedDownloadsService } from '@/app/(planning)/plan/(sar)/sar/admin/failed-downloads/_services/failed-downloads.service.interface';

const NOT_CONNECTED = '백엔드 미연결: 실패 다운로드 API 는 리팩토링 완료 후 연결됩니다.';

export const failedDownloadsCurrentServiceV1: IFailedDownloadsService = {
    async 실패_다운로드_목록을_조회한다() {
        return { success: false, message: NOT_CONNECTED, data: { jobs: [] } };
    },

    async 다운로드를_재시도한다(id) {
        return { success: false, message: `${NOT_CONNECTED} (${id})` };
    },

    async 다운로드를_무시한다(id) {
        return { success: false, message: `${NOT_CONNECTED} (${id})` };
    },
};
