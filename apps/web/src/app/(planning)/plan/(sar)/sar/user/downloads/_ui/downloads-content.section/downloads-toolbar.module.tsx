'use client';

import { Icon, useToast } from '@/_ui/hifi';
import { useDownloadsContext, type KindFilter } from '../../_context/DownloadsContext';

export function DownloadsToolbar() {
    const toast = useToast();
    const { jobs, kind, setKind } = useDownloadsContext();

    const kindTabs: [KindFilter, string, number][] = [
        ['all', '전체', jobs.length],
        ['SLC', 'SLC', jobs.filter((j) => j.productKind === 'SLC').length],
        ['GRD', 'GRD', jobs.filter((j) => j.productKind === 'GRD').length],
        ['RAW', 'RAW', jobs.filter((j) => j.productKind === 'RAW').length],
    ];

    return (
        <div className="toolbar">
            <div className="row gap-1">
                {kindTabs.map(([k, lbl, n]) => (
                    <span
                        key={k}
                        className={`chip${kind === k ? ' chip--active' : ''}`}
                        onClick={() => setKind(k)}
                    >
                        {lbl} {n}
                    </span>
                ))}
            </div>
            <div className="row gap-2" style={{ marginLeft: 'auto', alignItems: 'center' }}>
                <span className="badge badge--success">
                    <span className="dot" />
                    실시간
                </span>
                <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => toast('새로고침됨')}
                    aria-label="새로고침"
                >
                    <Icon name="refresh" size={13} />
                </button>
            </div>
        </div>
    );
}
