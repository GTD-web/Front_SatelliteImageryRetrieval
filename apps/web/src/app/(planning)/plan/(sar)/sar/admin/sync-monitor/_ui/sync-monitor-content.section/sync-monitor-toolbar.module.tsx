'use client';

import { useMemo } from 'react';

import { Icon } from '@/_ui/hifi';
import { useSyncMonitorContext } from '../../_context/SyncMonitorContext';
import { toNotif, type SyncNotif } from '../../_constants/sync-monitor-tone';
import type { SyncMonitorUI } from '../../_mocks/sync-monitor.ui-interface';
import { SyncTicker } from './sync-ticker.widget';

export function SyncMonitorToolbar() {
    const { runs, 전체_재시도한다 } = useSyncMonitorContext();

    const failedCount = runs.filter((r) => r.status === 'failed').length;

    // 실패를 앞쪽에 배치해 먼저 노출되게 하고, 성공/지연 알림도 함께 회전시킨다.
    const notifs = useMemo<SyncNotif[]>(() => {
        const order: Record<SyncMonitorUI.RunStatus, number> = { failed: 0, warning: 1, success: 2 };
        return [...runs].sort((a, b) => order[a.status] - order[b.status]).map(toNotif);
    }, [runs]);

    return (
        <div className="toolbar">
            <SyncTicker notifs={notifs} />
            <div className="row gap-2" style={{ marginLeft: 'auto', alignItems: 'center' }}>
                {failedCount > 0 ? (
                    <span className="badge badge--danger">{failedCount} 실패</span>
                ) : (
                    <span className="badge badge--success">전체 정상</span>
                )}
                <button type="button" className="btn btn--sm" onClick={() => void 전체_재시도한다()}>
                    <Icon name="refresh" size={13} /> 전체 재시도
                </button>
            </div>
        </div>
    );
}
