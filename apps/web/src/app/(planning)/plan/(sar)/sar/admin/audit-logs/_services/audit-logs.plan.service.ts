/**
 * 감사 로그 Plan 서비스 — Mock 위임
 */
import { mockAuditLogsService } from '../_mocks/audit-logs.mock';
import type { IAuditLogsService } from './audit-logs.service.interface';

export const auditLogsPlanService: IAuditLogsService = {
    감사_로그_목록을_조회한다: (params) => mockAuditLogsService.감사_로그_목록을_조회한다(params),
    감사_로그를_CSV로_직렬화한다: (logs) => mockAuditLogsService.감사_로그를_CSV로_직렬화한다(logs),
};
