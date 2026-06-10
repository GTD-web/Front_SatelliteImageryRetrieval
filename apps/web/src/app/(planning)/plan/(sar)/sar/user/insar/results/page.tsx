'use client';

import { InsarResultsProvider } from './_context/InsarResultsContext';
import { InsarResultsContent } from './_ui/insar-results-content.section';
import { insarResultsPlanService } from './_services/insar-results.plan.service';

export default function InsarResultsPage() {
    return (
        <InsarResultsProvider uiService={insarResultsPlanService}>
            <InsarResultsContent />
        </InsarResultsProvider>
    );
}
