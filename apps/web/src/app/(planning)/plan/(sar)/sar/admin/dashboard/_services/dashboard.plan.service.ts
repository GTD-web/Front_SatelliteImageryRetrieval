/**
 * 관리자 대시보드 Plan 서비스 — Mock 위임
 */
import { mockDashboardService } from '../_mocks/dashboard.mock';
import type { IDashboardService } from './dashboard.service.interface';

export const dashboardPlanService: IDashboardService = {
    대시보드_요약을_조회한다: (params) => mockDashboardService.대시보드_요약을_조회한다(params),
};
