/**
 * 감사 로그 Planning Mock (클라이언트 메모리 상태)
 *
 * 원본 page.tsx 가 인라인으로 갖고 있던 LOGS 와 파생값(ACTIONS_BY_CAT, LATEST_DATE)
 * 계산을 그대로 이관한다. 감사 로그는 읽기 전용이라 목록 조회 + CSV 직렬화만 제공한다.
 */
import type { IAuditLogsService } from '../_services/audit-logs.service.interface';
import type { AuditLogsUI } from './audit-logs.ui-interface';
import { CATEGORY_ORDER } from '../_constants/audit-logs-labels';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LOGS: AuditLogsUI.Log[] = [
    { ts: '2026-04-24 09:42:18', actor: 'kim@ksit.re.kr', action: 'DOWNLOAD_COMPLETE', target: 'job-58817', ip: '10.0.12.34', cat: '다운로드' },
    { ts: '2026-04-24 09:42:02', actor: 'park@ksit.re.kr', action: 'CART_SUBMIT', target: '148 scenes · req-221', ip: '10.0.12.58', cat: '다운로드' },
    { ts: '2026-04-24 09:38:14', actor: 'admin:hong', action: 'USER_APPROVE', target: 'choi@univ.ac.kr → viewer', ip: '10.0.11.2', cat: '승인' },
    { ts: '2026-04-24 09:30:44', actor: 'admin:hong', action: 'APPROVAL_APPROVE', target: 'req-218', ip: '10.0.11.2', cat: '승인' },
    { ts: '2026-04-24 09:22:18', actor: 'lee@labs.kr', action: 'LOGIN', target: '—', ip: '203.45.22.8', cat: '로그인' },
    { ts: '2026-04-24 09:15:00', actor: 'system', action: 'SYNC_FAILED', target: 'Seoul_metro · ESA 503', ip: '—', cat: '시스템' },
    {
        ts: '2026-04-24 08:45:32',
        actor: 'admin:hong',
        action: 'ROLE_CHANGE',
        target: 'jung@ksit.re.kr: viewer → downloader',
        ip: '10.0.11.2',
        cat: '승인',
    },
    { ts: '2026-04-24 08:12:04', actor: 'yoon@ksit.re.kr', action: 'LOGIN_FAILED', target: 'password mismatch', ip: '118.44.12.9', cat: '로그인' },
];

/** 데모 데이터의 최신 로그일 — 기간 프리셋의 기준점(오늘 대신)으로 써서 목업에서도 결과가 보이게 한다. */
const LATEST_DATE = LOGS.reduce(
    (m, l) => (l.ts.slice(0, 10) > m ? l.ts.slice(0, 10) : m),
    LOGS[0]!.ts.slice(0, 10),
);

/** 카테고리별 액션 코드 목록 — 고급 필터 액션 선택 UI 를 그룹핑하는 데 쓴다. */
const ACTION_GROUPS: AuditLogsUI.ActionGroup[] = CATEGORY_ORDER.map((cat) => ({
    cat,
    actions: [...new Set(LOGS.filter((l) => l.cat === cat).map((l) => l.action))],
})).filter((g) => g.actions.length > 0);

/** 로그 목록을 CSV 문자열로 직렬화한다. (원본 exportCsv 로직 그대로) */
function serializeCsv(logs: AuditLogsUI.Log[]): string {
    const header = 'ts,actor,action,target,ip\n';
    const rows = logs.map((l) => `${l.ts},${l.actor},${l.action},"${l.target}",${l.ip}`).join('\n');
    return header + rows;
}

export const mockAuditLogsService: IAuditLogsService = {
    async 감사_로그_목록을_조회한다() {
        await delay(120);
        return {
            success: true,
            message: '감사 로그 목록 조회 성공',
            data: { logs: [...LOGS], actionGroups: ACTION_GROUPS, latestDate: LATEST_DATE },
        };
    },

    async 감사_로그를_CSV로_직렬화한다(logs) {
        return { success: true, message: 'CSV 직렬화 성공', data: serializeCsv(logs) };
    },
};
