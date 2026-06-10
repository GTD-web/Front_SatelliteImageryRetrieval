/**
 * 관리자 대시보드 Current 서비스 v1 — 실제 API 연동 자리
 *
 * ⚠️ 백엔드 연결은 프론트 리팩토링 마무리 후 진행 예정.
 * 지금은 Plan 의 Context/UI 를 그대로 재사용할 수 있도록 계약(IDashboardService)만
 * 충족하는 스텁이다. 각 메서드는 추후 `/api/sar/admin/dashboard` BFF 라우트로 교체한다.
 *
 * BFF 연동 시 교체 지점:
 *   - 대시보드_요약을_조회한다 → GET /api/sar/admin/dashboard/summary?range={range}
 */
import type { IDashboardService } from '@/app/(planning)/plan/(sar)/sar/admin/dashboard/_services/dashboard.service.interface';

const NOT_CONNECTED = '백엔드 미연결: 대시보드 API 는 리팩토링 완료 후 연결됩니다.';

export const dashboardCurrentServiceV1: IDashboardService = {
    async 대시보드_요약을_조회한다() {
        return {
            success: false,
            message: NOT_CONNECTED,
            data: {
                kpis: [],
                throughput: { bars: [], linePoints: [], labels: [] },
                quickActions: [],
                events: [],
                nas: { rows: [], usedTb: 0, capacityTb: 60 },
            },
        };
    },
};
