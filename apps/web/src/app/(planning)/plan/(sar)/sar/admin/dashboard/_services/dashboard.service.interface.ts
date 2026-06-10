import type { DashboardUI } from '../_mocks/dashboard.ui-interface';

/**
 * 관리자 대시보드 UI 서비스 (Plan / Current 동일 인터페이스)
 *
 * 대시보드는 읽기 전용이라 단일 요약 조회만 노출한다. KPI/throughput/event/NAS 는
 * 한 화면이 함께 그리는 묶음이므로 range/shake 기준의 단일 요약으로 반환한다.
 */
export interface IDashboardService {
    대시보드_요약을_조회한다(
        params: DashboardUI.DashboardSummaryParams,
    ): Promise<DashboardUI.ServiceResponseWithData<DashboardUI.DashboardSummary>>;
}
