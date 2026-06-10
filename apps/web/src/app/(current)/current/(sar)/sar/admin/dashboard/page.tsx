'use client';

import { DashboardProvider } from '@/app/(planning)/plan/(sar)/sar/admin/dashboard/_context/DashboardContext';
import { DashboardContent } from '@/app/(planning)/plan/(sar)/sar/admin/dashboard/_ui/dashboard-content.section';
import { dashboardCurrentServiceV1 } from './_services/dashboard.current.service.v1';

export default function CurrentAdminDashboardPage() {
    return (
        <DashboardProvider uiService={dashboardCurrentServiceV1}>
            <DashboardContent />
        </DashboardProvider>
    );
}
