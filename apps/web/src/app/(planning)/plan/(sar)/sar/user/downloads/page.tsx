'use client';

import { DownloadsProvider } from './_context/DownloadsContext';
import { DownloadsContent } from './_ui/downloads-content.section';
import { downloadsPlanService } from './_services/downloads.plan.service';

export default function DownloadsPage() {
    return (
        <DownloadsProvider uiService={downloadsPlanService}>
            <DownloadsContent />
        </DownloadsProvider>
    );
}
