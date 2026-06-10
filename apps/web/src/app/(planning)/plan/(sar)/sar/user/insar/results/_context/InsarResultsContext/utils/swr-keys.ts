/**
 * SWR 키 팩토리 — 결과 데이터는 파라미터가 없어 정적 키를 쓴다.
 */
export function createInsarResultsKey() {
    return ['insar-results', 'data'] as const;
}
