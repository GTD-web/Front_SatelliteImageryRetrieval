import type { CrawlTargetsUI } from '../_mocks/crawl-targets.ui-interface';
import type { FootprintKind } from '@/_ui/hifi';

/** 상태 → 상태 점 색상 (CSS 변수) */
export const STATUS_COLOR: Record<CrawlTargetsUI.AoiStatus, string> = {
    healthy: 'var(--success)',
    warning: 'var(--warning)',
    stale: 'var(--warning)',
    failed: 'var(--danger)',
};

/** 상태 → 지도 footprint kind 매핑 */
export function statusToFootprintKind(status: CrawlTargetsUI.AoiStatus): FootprintKind {
    if (status === 'failed') return 'need';
    if (status === 'healthy') return 'have';
    return 'aoi';
}
