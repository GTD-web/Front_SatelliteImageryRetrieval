import type { DashboardUI } from '../../../_mocks/dashboard.ui-interface';

/**
 * SWR 키 팩토리 — range/shake 가 바뀔 때마다 새 요약을 조회한다.
 */
export function createDashboardSummaryKey(params: DashboardUI.DashboardSummaryParams) {
    return ['dashboard', 'summary', params.range, params.shake] as const;
}
