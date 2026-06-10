import type { AuditLogsUI } from '../_mocks/audit-logs.ui-interface';
import { actorTypeOf, isFail } from './audit-logs-labels';

/** 고급 필터 빈 상태 */
export const EMPTY_ADV: AuditLogsUI.AdvFilter = {
    start: '',
    end: '',
    actorTypes: [],
    actions: [],
    outcome: 'all',
};

/** 'YYYY-MM-DD' 에 days 를 더한 날짜 문자열을 돌려준다. */
export function shiftDays(ymd: string, days: number): string {
    const d = new Date(`${ymd}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

/** 적용된 고급 필터 조건 개수 */
export const advCount = (f: AuditLogsUI.AdvFilter): number =>
    (f.start || f.end ? 1 : 0) + f.actorTypes.length + f.actions.length + (f.outcome !== 'all' ? 1 : 0);

/** 고급 필터 술어 — 페이지 목록 필터와 모달 실시간 건수에서 함께 쓴다. */
export function matchesAdv(l: AuditLogsUI.Log, f: AuditLogsUI.AdvFilter): boolean {
    const day = l.ts.slice(0, 10);
    if (f.start && day < f.start) return false;
    if (f.end && day > f.end) return false;
    if (f.actorTypes.length > 0 && !f.actorTypes.includes(actorTypeOf(l.actor))) return false;
    if (f.actions.length > 0 && !f.actions.includes(l.action)) return false;
    if (f.outcome === 'fail' && !isFail(l.action)) return false;
    if (f.outcome === 'success' && isFail(l.action)) return false;
    return true;
}

/** 기간 프리셋 — latestDate(데모 데이터 최신 로그일) 를 기준점으로 범위를 만든다. */
export function datePresets(latestDate: string): Array<{ label: string; range: () => [string, string] }> {
    return [
        { label: '당일', range: () => [latestDate, latestDate] },
        { label: '최근 7일', range: () => [shiftDays(latestDate, -6), latestDate] },
        { label: '최근 30일', range: () => [shiftDays(latestDate, -29), latestDate] },
        { label: '전체', range: () => ['', ''] },
    ];
}
