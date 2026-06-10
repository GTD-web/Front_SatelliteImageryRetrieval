'use client';

import { Icon, Quicklook } from '@/_ui/hifi';
import { useDownloadsContext } from '../../_context/DownloadsContext';
import { PRODUCT_TONE, STATUS_LABEL } from '../../_constants/downloads-labels';
import type { DownloadsUI } from '../../_mocks/downloads.ui-interface';

export function DownloadsTable({ jobs }: { jobs: DownloadsUI.Job[] }) {
    const { 다운로드를_재시도한다, NAS에서_다운로드한다 } = useDownloadsContext();

    if (jobs.length === 0) {
        return (
            <div className="empty" style={{ padding: 60 }}>
                <div className="empty__icon">📭</div>
                <div>다운로드 잡이 없습니다</div>
            </div>
        );
    }

    return (
        <table className="table">
            <thead>
                <tr>
                    <th style={{ width: 56 }}>미리보기</th>
                    <th>Scene</th>
                    <th>상태</th>
                    <th style={{ width: 220 }}>NAS 진행</th>
                    <th className="num">용량</th>
                    <th>시작</th>
                    <th>종료</th>
                    <th>ETA</th>
                    <th style={{ width: 140 }}>다운로드</th>
                </tr>
            </thead>
            <tbody>
                {jobs.map((j) => (
                    <tr key={j.id}>
                        <td>
                            <Quicklook sceneId={j.scene} size={42} product={j.productKind} />
                        </td>
                        <td>
                            <div className="row gap-2">
                                <span
                                    className={`badge ${PRODUCT_TONE[j.productKind]}`}
                                    style={{ fontSize: 10 }}
                                >
                                    {j.productKind}
                                </span>
                                <div className="mono" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
                                    {j.scene}
                                </div>
                            </div>
                        </td>
                        <td>
                            <span className={`status status--${j.status}`}>{STATUS_LABEL[j.status]}</span>
                        </td>
                        <td>
                            {j.status === 'done' ? (
                                <div className="row gap-2">
                                    <div className="progress progress--success" style={{ flex: 1 }}>
                                        <div className="progress__fill" style={{ width: '100%' }} />
                                    </div>
                                    <span
                                        className="mono tabular"
                                        style={{ fontSize: 11.5, minWidth: 32, textAlign: 'right' }}
                                    >
                                        100%
                                    </span>
                                </div>
                            ) : j.status === 'failed' ? (
                                <div className="progress progress--danger">
                                    <div className="progress__fill" style={{ width: `${j.progress}%` }} />
                                </div>
                            ) : j.status === 'queued' ? (
                                <span className="faint" style={{ fontSize: 12 }}>
                                    대기
                                </span>
                            ) : (
                                <div className="row gap-2">
                                    <div className="progress" style={{ flex: 1 }}>
                                        <div
                                            className="progress__fill"
                                            style={{ width: `${j.progress}%` }}
                                        />
                                    </div>
                                    <span
                                        className="mono tabular"
                                        style={{ fontSize: 11.5, minWidth: 32, textAlign: 'right' }}
                                    >
                                        {j.progress}%
                                    </span>
                                </div>
                            )}
                        </td>
                        <td className="num tabular mono" style={{ fontSize: 12 }}>
                            {j.size}
                        </td>
                        <td className="mono tabular faint" style={{ fontSize: 12 }}>
                            {j.started}
                        </td>
                        <td className="mono tabular faint" style={{ fontSize: 12 }}>
                            {j.finished}
                        </td>
                        <td
                            className={j.status === 'failed' ? '' : 'mono tabular'}
                            style={{
                                fontSize: 12,
                                color: j.status === 'failed' ? 'var(--danger)' : undefined,
                            }}
                        >
                            {j.eta}
                        </td>
                        <td>
                            <div className="row gap-1">
                                {j.status === 'done' ? (
                                    <button
                                        type="button"
                                        className="btn btn--outline-accent btn--sm"
                                        onClick={() => void NAS에서_다운로드한다(j.id)}
                                    >
                                        <Icon name="download" size={12} /> 받기
                                    </button>
                                ) : null}
                                {j.status === 'failed' ? (
                                    <button
                                        type="button"
                                        className="btn btn--sm"
                                        onClick={() => void 다운로드를_재시도한다(j.id)}
                                    >
                                        <Icon name="refresh" size={12} /> 재시도
                                    </button>
                                ) : null}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
