'use client';

import { Icon } from '@/_ui/hifi';
import { useFailedDownloadsContext, type Filter } from '../../_context/FailedDownloadsContext';
import { KIND_LABEL } from '../../_constants/failed-downloads-labels';
import type { FailedDownloadsUI } from '../../_mocks/failed-downloads.ui-interface';

export function FailedDownloadsToolbar() {
    const { jobs, filter, setFilter, q, setQ, sel, 선택_재시도한다, 선택_무시한다 } = useFailedDownloadsContext();

    const kindTabs: [Filter, number][] = [
        ['전체', jobs.length],
        ['CDSE_5XX', jobs.filter((j) => j.kind === 'CDSE_5XX').length],
        ['NAS_FULL', jobs.filter((j) => j.kind === 'NAS_FULL').length],
        ['AUTH', jobs.filter((j) => j.kind === 'AUTH').length],
        ['CHECKSUM', jobs.filter((j) => j.kind === 'CHECKSUM').length],
        ['NETWORK', jobs.filter((j) => j.kind === 'NETWORK').length],
    ];

    const selIds = () => [...sel];

    return (
        <div className="toolbar">
            <input
                className="input input--search"
                placeholder="Scene / 사용자 / job-id 검색…"
                style={{ width: 280 }}
                value={q}
                onChange={(e) => setQ(e.target.value)}
            />
            <div className="row gap-1">
                {kindTabs.map(([k, n]) => (
                    <span
                        key={k}
                        className={`chip${filter === k ? ' chip--active' : ''}`}
                        onClick={() => setFilter(k)}
                    >
                        {k === '전체' ? '전체' : KIND_LABEL[k as FailedDownloadsUI.FailureKind]} {n}
                    </span>
                ))}
            </div>
            <div className="row gap-2" style={{ marginLeft: 'auto', alignItems: 'center' }}>
                <span className="badge badge--danger">{jobs.length}건 실패</span>
                <button
                    type="button"
                    className="btn btn--sm"
                    disabled={sel.size === 0}
                    onClick={() => void 선택_무시한다(selIds())}
                >
                    <Icon name="x" size={12} /> 무시 {sel.size > 0 ? `(${sel.size})` : ''}
                </button>
                <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    disabled={sel.size === 0}
                    onClick={() => void 선택_재시도한다(selIds())}
                >
                    <Icon name="refresh" size={12} /> 재시도 {sel.size > 0 ? `(${sel.size})` : ''}
                </button>
            </div>
        </div>
    );
}
