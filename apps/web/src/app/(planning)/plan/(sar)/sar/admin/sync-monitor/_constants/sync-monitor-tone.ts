import type { SyncMonitorUI } from '../_mocks/sync-monitor.ui-interface';

/** 티커 슬롯에 띄울 알림 모델 */
export interface SyncNotif {
    tone: SyncMonitorUI.RunStatus;
    icon: 'check' | 'clock' | 'x';
    title: string;
    sub: string;
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
    if (r.status === 'failed') {
        return { tone: 'failed', icon: 'x', title: `${r.aoi} 동기화 실패`, sub: r.err ?? '오류' };
    }
    if (r.status === 'warning') {
        return { tone: 'warning', icon: 'clock', title: `${r.aoi} 동기화 지연`, sub: '5분 후 자동 재시도' };
    }
    return { tone: 'success', icon: 'check', title: `${r.aoi} 동기화 완료`, sub: `신규 ${r.fetched} Scene` };
}
