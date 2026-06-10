/**
 * 동기화 모니터 Plan 서비스 — Mock 위임
 */
import { mockSyncMonitorService } from '../_mocks/sync-monitor.mock';
import type { ISyncMonitorService } from './sync-monitor.service.interface';

export const syncMonitorPlanService: ISyncMonitorService = {
    동기화_이력을_조회한다: () => mockSyncMonitorService.동기화_이력을_조회한다(),
    AOI를_재시도한다: (aoi) => mockSyncMonitorService.AOI를_재시도한다(aoi),
};
