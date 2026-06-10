/**
 * 내 다운로드 Current 서비스 v1 — 실제 API 연동 자리
 *
 * ⚠️ 백엔드 연결은 프론트 리팩토링 마무리 후 진행 예정.
 * 지금은 Plan 의 Context/UI 를 그대로 재사용할 수 있도록 계약(IDownloadsService)만
 * 충족하는 스텁이다. 각 메서드는 추후 `/api/sar/user/downloads` BFF 라우트로 교체한다.
 *
 * BFF 연동 시 교체 지점:
 *   - 다운로드_잡_목록을_조회한다       → GET  /api/sar/user/downloads
 *   - 스테이징_진행을_시뮬레이션한다     → (폴링으로 대체) GET /api/sar/user/downloads
 *   - 대기_잡을_시작한다                 → (서버 큐 스케줄러가 담당, 클라 no-op 예정)
 *   - 다운로드를_재시도한다             → POST /api/sar/user/downloads/{id}/retry
 *   - NAS에서_다운로드한다             → POST /api/sar/user/downloads/{id}/fetch
 */
import type { IDownloadsService } from '@/app/(planning)/plan/(sar)/sar/user/downloads/_services/downloads.service.interface';

const NOT_CONNECTED = '백엔드 미연결: 다운로드 API 는 리팩토링 완료 후 연결됩니다.';

export const downloadsCurrentServiceV1: IDownloadsService = {
    async 다운로드_잡_목록을_조회한다() {
        return { success: false, message: NOT_CONNECTED, data: { jobs: [] } };
    },

    async 스테이징_진행을_시뮬레이션한다() {
        return { success: false, message: NOT_CONNECTED, data: { jobs: [] } };
    },

    async 대기_잡을_시작한다() {
        return { success: false, message: NOT_CONNECTED, data: { jobs: [] } };
    },

    async 다운로드를_재시도한다(id) {
        return { success: false, message: `${NOT_CONNECTED} (${id})` };
    },

    async NAS에서_다운로드한다(id) {
        return { success: false, message: `${NOT_CONNECTED} (${id})` };
    },
};
