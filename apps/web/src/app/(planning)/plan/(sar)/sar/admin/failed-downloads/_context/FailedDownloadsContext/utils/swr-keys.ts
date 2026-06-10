import type { FailedDownloadsUI } from '../../../_mocks/failed-downloads.ui-interface';

/**
 * SWR 키 팩토리 — queries 와 commands(mutate) 가 동일 키를 공유한다.
 */
export function createFailedJobsKey(params?: FailedDownloadsUI.FailedJobListParams) {
    return ['failed-downloads', 'list', params?.keyword ?? ''] as const;
}
