'use client';

import { useAuditLogsContext } from '../../_context/AuditLogsContext';
import { AuditLogsToolbar } from './audit-logs-toolbar.module';
import { AuditLogsChips } from './audit-logs-chips.module';
import { AuditLogsTable } from './audit-logs-table.module';
import { AdvancedFilterModal } from './advanced-filter.widget';

export function AuditLogsContent() {
    const { advOpen } = useAuditLogsContext();

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <AuditLogsToolbar />
            <AuditLogsChips />
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                <AuditLogsTable />
            </div>
            {advOpen ? <AdvancedFilterModal /> : null}
        </div>
    );
}
