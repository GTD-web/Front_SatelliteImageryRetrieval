/**
 * SWR 키 팩토리 — queries 와 commands(mutate) 가 동일 키를 공유한다.
 */
export function createSyncHistoryKey() {
    return ['sync-monitor', 'history'] as const;
}
