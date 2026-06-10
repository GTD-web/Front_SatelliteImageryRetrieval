'use client';

import { AuditLogsProvider } from '@/app/(planning)/plan/(sar)/sar/admin/audit-logs/_context/AuditLogsContext';
import { AuditLogsContent } from '@/app/(planning)/plan/(sar)/sar/admin/audit-logs/_ui/audit-logs-content.section';
import { auditLogsCurrentServiceV1 } from './_services/audit-logs.current.service.v1';

export default function CurrentAuditLogsPage() {
    return (
        <AuditLogsProvider uiService={auditLogsCurrentServiceV1}>
            <AuditLogsContent />
        </AuditLogsProvider>
    );
}
