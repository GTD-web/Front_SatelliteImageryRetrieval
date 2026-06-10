'use client';

import { AoisProvider } from './_context/AoisContext';
import { AoisContent } from './_ui/aois-content.section';
import { aoisPlanService } from './_services/aois.plan.service';

export default function AoisPage() {
    return (
        <AoisProvider uiService={aoisPlanService}>
            <AoisContent />
        </AoisProvider>
    );
}
