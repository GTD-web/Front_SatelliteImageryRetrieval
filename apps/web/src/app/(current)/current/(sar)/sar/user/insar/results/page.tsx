'use client';

import { InsarResultsProvider } from '@/app/(planning)/plan/(sar)/sar/user/insar/results/_context/InsarResultsContext';
import { InsarResultsContent } from '@/app/(planning)/plan/(sar)/sar/user/insar/results/_ui/insar-results-content.section';
import { insarResultsCurrentServiceV1 } from './_services/insar-results.current.service.v1';

export default function CurrentInsarResultsPage() {
    return (
        <InsarResultsProvider uiService={insarResultsCurrentServiceV1}>
            <InsarResultsContent />
        </InsarResultsProvider>
    );
}
