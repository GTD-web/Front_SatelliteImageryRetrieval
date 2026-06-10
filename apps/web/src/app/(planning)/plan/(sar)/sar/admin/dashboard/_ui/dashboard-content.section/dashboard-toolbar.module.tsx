'use client';

import { Icon } from '@/_ui/hifi';
import { useDashboardContext } from '../../_context/DashboardContext';
import { RANGE_OPTIONS } from '../../_constants/dashboard-labels';

/** 갱신 시각 표기 (시:분:초) */
function formatTime(d: Date) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mi}:${ss}`;
}

export function DashboardToolbar() {
    const { range, setRange, lastUpdated, mounted, refresh } = useDashboardContext();

    return (
        <div className="toolbar" style={{ justifyContent: 'flex-end', gap: 12 }}>
            <span className="faint mono tabular" style={{ fontSize: 11.5 }}>
                {mounted ? `갱신 ${formatTime(lastUpdated)}` : ''}
            </span>
            <div className="segmented" role="tablist" aria-label="시간 범위">
                {RANGE_OPTIONS.map((r) => (
                    <button
                        key={r}
                        type="button"
                        role="tab"
                        aria-selected={range === r}
                        className={range === r ? 'active' : ''}
                        onClick={() => setRange(r)}
                    >
                        {r}
                    </button>
                ))}
            </div>
            <button
                type="button"
                className="btn btn--sm"
                onClick={refresh}
                aria-label="새로고침"
                data-tooltip="새로고침"
            >
                <Icon name="refresh" size={13} />
            </button>
        </div>
    );
}
