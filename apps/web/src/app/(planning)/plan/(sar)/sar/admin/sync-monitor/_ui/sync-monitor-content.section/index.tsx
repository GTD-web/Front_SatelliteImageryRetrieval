'use client';

import { SyncMonitorToolbar } from './sync-monitor-toolbar.module';
import { SyncHistoryTable } from './sync-history-table.module';

export function SyncMonitorContent() {
    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <SyncMonitorToolbar />
            <div className="col gap-3" style={{ padding: 24, flex: 1, overflow: 'auto' }}>
                <SyncHistoryTable />
            </div>
        </div>
    );
}
