'use client';

import { CrawlTargetsProvider } from '@/app/(planning)/plan/(sar)/sar/admin/crawl-targets/_context/CrawlTargetsContext';
import { CrawlTargetsContent } from '@/app/(planning)/plan/(sar)/sar/admin/crawl-targets/_ui/crawl-targets-content.section';
import { crawlTargetsCurrentServiceV1 } from './_services/crawl-targets.current.service.v1';

export default function CurrentCrawlTargetsPage() {
    return (
        <CrawlTargetsProvider uiService={crawlTargetsCurrentServiceV1}>
            <CrawlTargetsContent />
        </CrawlTargetsProvider>
    );
}
