import type { SyncMonitorUI } from '../_mocks/sync-monitor.ui-interface';

/**
 * 동기화 모니터 UI 서비스 (Plan / Current 동일 인터페이스)
 */
export interface ISyncMonitorService {
    동기화_이력을_조회한다(): Promise<
        SyncMonitorUI.ServiceResponseWithData<SyncMonitorUI.SyncHistoryResponse>
    >;

    AOI를_재시도한다(
        aoi: string,
    ): Promise<SyncMonitorUI.ServiceResponseWithData<SyncMonitorUI.Run>>;
}
