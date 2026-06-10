'use client';

import { FailedDownloadsToolbar } from './failed-downloads-toolbar.module';
import { FailedDownloadsTable } from './failed-downloads-table.module';

export function FailedDownloadsContent() {
    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <FailedDownloadsToolbar />
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                <FailedDownloadsTable />
            </div>
        </div>
    );
}
