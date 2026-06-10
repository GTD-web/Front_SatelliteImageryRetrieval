import type { AuditLogsUI } from '../../../_mocks/audit-logs.ui-interface';

/**
 * SWR 키 팩토리 — 감사 로그 목록 조회용.
 */
export function createAuditLogsKey(params?: AuditLogsUI.LogListParams) {
    return ['audit-logs', 'list', params?.keyword ?? ''] as const;
}
