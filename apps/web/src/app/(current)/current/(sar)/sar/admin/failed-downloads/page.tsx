'use client';

import { FailedDownloadsProvider } from '@/app/(planning)/plan/(sar)/sar/admin/failed-downloads/_context/FailedDownloadsContext';
import { FailedDownloadsContent } from '@/app/(planning)/plan/(sar)/sar/admin/failed-downloads/_ui/failed-downloads-content.section';
import { failedDownloadsCurrentServiceV1 } from './_services/failed-downloads.current.service.v1';

export default function CurrentFailedDownloadsPage() {
    return (
        <FailedDownloadsProvider uiService={failedDownloadsCurrentServiceV1}>
            <FailedDownloadsContent />
        </FailedDownloadsProvider>
    );
}
