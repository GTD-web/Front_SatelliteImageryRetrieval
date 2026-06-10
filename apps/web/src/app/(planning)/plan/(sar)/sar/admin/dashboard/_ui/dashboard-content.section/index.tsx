'use client';

import { DashboardToolbar } from './dashboard-toolbar.module';
import { KpiCards } from './kpi-cards.widget';
import { ThroughputPanel } from './throughput.panel';
import { QuickActionsPanel } from './quick-actions.panel';
import { RealtimeEventsPanel } from './realtime-events.panel';
import { NasUsagePanel } from './nas-usage.panel';

export function DashboardContent() {
    return (
        <div className="col" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <DashboardToolbar />
            <div className="col gap-4" style={{ padding: 24 }}>
                <KpiCards />

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <ThroughputPanel />
                    <QuickActionsPanel />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <RealtimeEventsPanel />
                    <NasUsagePanel />
                </div>
            </div>
        </div>
    );
}
