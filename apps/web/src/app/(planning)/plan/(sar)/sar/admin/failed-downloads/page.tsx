'use client';

import { FailedDownloadsProvider } from './_context/FailedDownloadsContext';
import { FailedDownloadsContent } from './_ui/failed-downloads-content.section';
import { failedDownloadsPlanService } from './_services/failed-downloads.plan.service';

export default function FailedDownloadsPage() {
    return (
        <FailedDownloadsProvider uiService={failedDownloadsPlanService}>
            <FailedDownloadsContent />
        </FailedDownloadsProvider>
    );
}
