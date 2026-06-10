'use client';

import { DownloadsProvider } from '@/app/(planning)/plan/(sar)/sar/user/downloads/_context/DownloadsContext';
import { DownloadsContent } from '@/app/(planning)/plan/(sar)/sar/user/downloads/_ui/downloads-content.section';
import { downloadsCurrentServiceV1 } from './_services/downloads.current.service.v1';

export default function CurrentDownloadsPage() {
    return (
        <DownloadsProvider uiService={downloadsCurrentServiceV1}>
            <DownloadsContent />
        </DownloadsProvider>
    );
}
