'use client';

import { SyncMonitorProvider } from './_context/SyncMonitorContext';
import { SyncMonitorContent } from './_ui/sync-monitor-content.section';
import { syncMonitorPlanService } from './_services/sync-monitor.plan.service';

export default function SyncMonitorPage() {
    return (
        <SyncMonitorProvider uiService={syncMonitorPlanService}>
            <SyncMonitorContent />
        </SyncMonitorProvider>
    );
}
