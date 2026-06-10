/**
 * 감사 로그 Current 서비스 v1 — 실제 API 연동 자리
 *
 * ⚠️ 백엔드 연결은 프론트 리팩토링 마무리 후 진행 예정.
 * 지금은 Plan 의 Context/UI 를 그대로 재사용할 수 있도록 계약(IAuditLogsService)만
 * 충족하는 스텁이다. 각 메서드는 추후 `/api/sar/admin/audit-logs` BFF 라우트로 교체한다.
 *
 * BFF 연동 시 교체 지점:
 *   - 감사_로그_목록을_조회한다 → GET /api/sar/admin/audit-logs?keyword={keyword}
 *   - 감사_로그를_CSV로_직렬화한다 → GET /api/sar/admin/audit-logs/export.csv (또는 클라이언트 직렬화 유지)
 */
import type { IAuditLogsService } from '@/app/(planning)/plan/(sar)/sar/admin/audit-logs/_services/audit-logs.service.interface';

const NOT_CONNECTED = '백엔드 미연결: 감사 로그 API 는 리팩토링 완료 후 연결됩니다.';

export const auditLogsCurrentServiceV1: IAuditLogsService = {
    async 감사_로그_목록을_조회한다() {
        return {
            success: false,
            message: NOT_CONNECTED,
            data: { logs: [], actionGroups: [], latestDate: '' },
        };
    },

    async 감사_로그를_CSV로_직렬화한다() {
        return {
            success: false,
            message: NOT_CONNECTED,
            data: '',
        };
    },
};
