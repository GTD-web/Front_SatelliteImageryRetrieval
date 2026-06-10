import type { AoisUI } from '../../../_mocks/aois.ui-interface';

/**
 * SWR 키 팩토리 — queries 와 commands(mutate) 가 동일 키를 공유한다.
 */
export function createAoiListKey(params?: AoisUI.AoiListParams) {
    return ['user-aois', 'aoi-list', params?.keyword ?? ''] as const;
}
