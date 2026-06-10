'use client';

import { DashboardProvider } from './_context/DashboardContext';
import { DashboardContent } from './_ui/dashboard-content.section';
import { dashboardPlanService } from './_services/dashboard.plan.service';

export default function AdminDashboardPage() {
    return (
        <DashboardProvider uiService={dashboardPlanService}>
            <DashboardContent />
        </DashboardProvider>
    );
}
