'use client';

import { SyncMonitorProvider } from '@/app/(planning)/plan/(sar)/sar/admin/sync-monitor/_context/SyncMonitorContext';
import { SyncMonitorContent } from '@/app/(planning)/plan/(sar)/sar/admin/sync-monitor/_ui/sync-monitor-content.section';
import { syncMonitorCurrentServiceV1 } from './_services/sync-monitor.current.service.v1';

export default function CurrentSyncMonitorPage() {
    return (
        <SyncMonitorProvider uiService={syncMonitorCurrentServiceV1}>
            <SyncMonitorContent />
        </SyncMonitorProvider>
    );
}
