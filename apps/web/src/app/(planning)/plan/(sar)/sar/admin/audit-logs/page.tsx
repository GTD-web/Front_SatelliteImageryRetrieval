'use client';

import { AuditLogsProvider } from './_context/AuditLogsContext';
import { AuditLogsContent } from './_ui/audit-logs-content.section';
import { auditLogsPlanService } from './_services/audit-logs.plan.service';

export default function AuditLogsPage() {
    return (
        <AuditLogsProvider uiService={auditLogsPlanService}>
            <AuditLogsContent />
        </AuditLogsProvider>
    );
}
