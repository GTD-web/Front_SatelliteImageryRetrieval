'use client';

import { Icon } from '@/_ui/hifi';
import { useSyncMonitorContext } from '../../_context/SyncMonitorContext';

export function SyncHistoryTable() {
    const { runs, AOI를_재시도한다 } = useSyncMonitorContext();

    return (
        <div className="card">
            <div className="card__header">
                <div className="card__title">동기화 이력 (24h)</div>
                <span className="faint" style={{ fontSize: 12 }}>
                    총 {runs.length}회
                </span>
            </div>
            <table className="table">
                <thead>
                    <tr>
                        <th>AOI</th>
                        <th>시작</th>
                        <th>소요</th>
                        <th className="num">신규 Scene</th>
                        <th>결과</th>
                        <th style={{ width: 120 }}></th>
                    </tr>
                </thead>
                <tbody>
                    {runs.map((r, i) => (
                        <tr key={i}>
                            <td>
                                <span style={{ fontWeight: 500 }}>{r.aoi}</span>
                            </td>
                            <td className="mono tabular faint" style={{ fontSize: 12 }}>
                                {r.started}
                            </td>
                            <td className="mono tabular faint" style={{ fontSize: 12 }}>
                                {r.duration}
                            </td>
                            <td className="num mono tabular">{r.fetched}</td>
                            <td>
                                {r.status === 'success' ? (
                                    <span className="status status--done">성공</span>
                                ) : r.status === 'warning' ? (
                                    <span className="status status--pending">지연</span>
                                ) : (
                                    <div className="col" style={{ gap: 2 }}>
                                        <span className="status status--failed">실패</span>
                                        <span className="mono faint" style={{ fontSize: 11 }}>
                                            {r.err}
                                        </span>
                                    </div>
                                )}
                            </td>
                            <td>
                                {r.status !== 'success' ? (
                                    <button
                                        type="button"
                                        className="btn btn--sm"
                                        onClick={() => void AOI를_재시도한다(r.aoi)}
                                    >
                                        <Icon name="refresh" size={12} /> 재시도
                                    </button>
                                ) : null}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
