'use client';

import { CrawlTargetsProvider } from './_context/CrawlTargetsContext';
import { CrawlTargetsContent } from './_ui/crawl-targets-content.section';
import { crawlTargetsPlanService } from './_services/crawl-targets.plan.service';

export default function CrawlTargetsPage() {
    return (
        <CrawlTargetsProvider uiService={crawlTargetsPlanService}>
            <CrawlTargetsContent />
        </CrawlTargetsProvider>
    );
}
