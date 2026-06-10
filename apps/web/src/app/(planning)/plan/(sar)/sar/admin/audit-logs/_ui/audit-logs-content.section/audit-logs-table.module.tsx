'use client';

import { useAuditLogsContext } from '../../_context/AuditLogsContext';
import { actionColor } from '../../_constants/audit-logs-labels';

export function AuditLogsTable() {
    const { filtered } = useAuditLogsContext();

    return (
        <div className="card">
            <table className="table">
                <thead>
                    <tr>
                        <th style={{ width: 180 }}>시각</th>
                        <th>액터</th>
                        <th>액션</th>
                        <th>대상</th>
                        <th>IP</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="empty" style={{ padding: 40 }}>
                                일치하는 로그가 없습니다
                            </td>
                        </tr>
                    ) : (
                        filtered.map((l, i) => (
                            <tr key={i}>
                                <td className="mono tabular faint" style={{ fontSize: 11.5 }}>
                                    {l.ts}
                                </td>
                                <td>
                                    <span
                                        className={
                                            l.actor.startsWith('admin')
                                                ? 'badge badge--brand2'
                                                : l.actor === 'system'
                                                  ? 'badge badge--neutral'
                                                  : ''
                                        }
                                    >
                                        {l.actor}
                                    </span>
                                </td>
                                <td>
                                    <span
                                        className="mono"
                                        style={{ fontSize: 11.5, fontWeight: 600, color: actionColor(l.action) }}
                                    >
                                        {l.action}
                                    </span>
                                </td>
                                <td style={{ fontSize: 12.5 }}>{l.target}</td>
                                <td className="mono tabular faint" style={{ fontSize: 11.5 }}>
                                    {l.ip}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
