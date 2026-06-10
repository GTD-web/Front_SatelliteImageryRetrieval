/**
 * SWR 키 팩토리 — 분석 품질 요약은 파라미터가 없어 정적 키를 쓴다.
 */
export function createAnalysisQaSummaryKey() {
    return ['analysis-qa', 'summary'] as const;
}
