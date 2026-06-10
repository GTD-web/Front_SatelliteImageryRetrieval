'use client';

import { useDashboardContext } from '../../_context/DashboardContext';
import { RANGE_LABEL, STATUS_COLOR } from '../../_constants/dashboard-labels';

export function RealtimeEventsPanel() {
    const { range, summary } = useDashboardContext();
    const events = summary.events;

    return (
        <div className="card" style={{ minHeight: 300 }}>
            <div className="card__header">
                <div>
                    <div className="card__title">실시간 이벤트</div>
                    <div className="card__subtle">
                        WebSocket · {RANGE_LABEL[range]} · {events.length}건
                    </div>
                </div>
                <span className="badge badge--success">
                    <span className="dot" />
                    Connected
                </span>
            </div>
            <div
                className="col"
                style={{
                    fontSize: 12.5,
                    fontFamily: 'var(--font-mono)',
                    padding: '4px 18px 18px',
                    maxHeight: 280,
                    overflow: 'auto',
                }}
            >
                {events.length === 0 ? (
                    <div className="empty" style={{ padding: 24, fontSize: 12 }}>
                        이 범위에 표시할 이벤트가 없습니다
                    </div>
                ) : (
                    events.map((e, i) => (
                        <div
                            key={i}
                            className="row gap-3"
                            style={{
                                padding: '6px 0',
                                borderBottom: i < events.length - 1 ? '1px dashed var(--border-subtle)' : undefined,
                            }}
                        >
                            <span style={{ color: 'var(--text-tertiary)' }}>{e.time}</span>
                            <span className="badge badge--neutral" style={{ minWidth: 80, justifyContent: 'center' }}>
                                {e.type}
                            </span>
                            <span style={{ color: STATUS_COLOR[e.status] ?? 'var(--text-secondary)', minWidth: 70 }}>
                                ●&nbsp;&nbsp;{e.status}
                            </span>
                            <span className="truncate" style={{ color: 'var(--text-secondary)', flex: 1 }}>
                                {e.message}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
