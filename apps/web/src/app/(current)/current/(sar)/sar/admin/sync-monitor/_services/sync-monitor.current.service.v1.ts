/**
 * 동기화 모니터 Current 서비스 v1 — 실제 API 연동 자리
 *
 * ⚠️ 백엔드 연결은 프론트 리팩토링 마무리 후 진행 예정.
 * 지금은 Plan 의 Context/UI 를 재사용할 수 있도록 계약(ISyncMonitorService)만 충족하는 스텁이다.
 *
 * BFF 연동 시 교체 지점:
 *   - 동기화_이력을_조회한다 → GET  /api/sar/admin/sync-monitor/history
 *   - AOI를_재시도한다       → POST /api/sar/admin/sync-monitor/{aoi}/retry
 */
import type { ISyncMonitorService } from '@/app/(planning)/plan/(sar)/sar/admin/sync-monitor/_services/sync-monitor.service.interface';

const NOT_CONNECTED = '백엔드 미연결: 동기화 모니터 API 는 리팩토링 완료 후 연결됩니다.';

export const syncMonitorCurrentServiceV1: ISyncMonitorService = {
    async 동기화_이력을_조회한다() {
        return { success: false, message: NOT_CONNECTED, data: { runs: [] } };
    },

    async AOI를_재시도한다(aoi) {
        return { success: false, message: `${NOT_CONNECTED} (${aoi})` };
    },
};
