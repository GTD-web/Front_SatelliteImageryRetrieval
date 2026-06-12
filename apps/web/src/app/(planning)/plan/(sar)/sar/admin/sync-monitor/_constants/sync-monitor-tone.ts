import type { SyncMonitorUI } from '../_mocks/sync-monitor.ui-interface';

/** 티커 슬롯에 띄울 알림 모델 */
export interface SyncNotif {
    tone: SyncMonitorUI.RunStatus;
    icon: 'check' | 'clock' | 'x';
    title: string;
    sub: string;
    /** 짧은 상태 라벨 (완료 / 지연 / 실패) */
    badge: string;
    /** 동기화 시작 시각 */
    started: string;
    /** 소요 시간 */
    duration: string;
    /** 신규 Scene 수 */
    fetched: number;
}

export const TONE_FG: Record<SyncMonitorUI.RunStatus, string> = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    failed: 'var(--danger)',
};

export const TONE_BG: Record<SyncMonitorUI.RunStatus, string> = {
    success: 'var(--success-soft)',
    warning: 'var(--warning-soft)',
    failed: 'var(--danger-soft)',
};

/** 동기화 실행 결과 1건을 상단 티커 알림으로 변환. 성공/지연/실패를 모두 표현한다. */
export function toNotif(r: SyncMonitorUI.Run): SyncNotif {
    const base = { started: r.started, duration: r.duration, fetched: r.fetched };
    if (r.status === 'failed') {
        return { tone: 'failed', icon: 'x', title: `${r.aoi} 동기화 실패`, sub: r.err ?? '오류', badge: '실패', ...base };
    }
    if (r.status === 'warning') {
        return { tone: 'warning', icon: 'clock', title: `${r.aoi} 동기화 지연`, sub: '5분 후 자동 재시도', badge: '지연', ...base };
    }
    return { tone: 'success', icon: 'check', title: `${r.aoi} 동기화 완료`, sub: `신규 ${r.fetched} Scene`, badge: '완료', ...base };
}
