import type { CrawlTargetsUI } from '../../../_mocks/crawl-targets.ui-interface';

/**
 * SWR 키 팩토리 — queries 와 commands(mutate) 가 동일 키를 공유한다.
 */
export function createAoiListKey(params?: CrawlTargetsUI.AoiListParams) {
    return ['crawl-targets', 'aoi-list', params?.keyword ?? ''] as const;
}
