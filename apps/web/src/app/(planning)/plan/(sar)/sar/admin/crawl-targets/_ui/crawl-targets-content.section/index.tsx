'use client';

import { ShapefileUploadModal } from '@/_ui/hifi';
import { useCrawlTargetsContext } from '../../_context/CrawlTargetsContext';
import { CrawlTargetsToolbar } from './crawl-targets-toolbar.module';
import { AoiListPanel } from './aoi-list.panel';
import { AoiMapPanel } from './aoi-map.panel';

export function CrawlTargetsContent() {
    const { shpOpen, closeShp } = useCrawlTargetsContext();

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <CrawlTargetsToolbar />
            <div className="split">
                <AoiListPanel />
                <AoiMapPanel />
            </div>
            {shpOpen ? <ShapefileUploadModal onClose={closeShp} /> : null}
        </div>
    );
}
