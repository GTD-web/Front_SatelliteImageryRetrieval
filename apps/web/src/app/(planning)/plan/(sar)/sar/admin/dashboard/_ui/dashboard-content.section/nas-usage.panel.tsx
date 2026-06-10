'use client';

import { useDashboardContext } from '../../_context/DashboardContext';

export function NasUsagePanel() {
    const { summary } = useDashboardContext();
    const { rows, usedTb, capacityTb } = summary.nas;

    return (
        <div className="card">
            <div className="card__header">
                <div className="card__title">NAS 사용량 분포</div>
            </div>
            <div className="card__body col gap-3">
                {rows.map((row) => (
                    <div key={row.label}>
                        <div className="between" style={{ fontSize: 12, marginBottom: 4 }}>
                            <span>{row.label}</span>
                            <span className="mono tabular faint">{row.valueTb} TB</span>
                        </div>
                        <div className="progress">
                            <div
                                className="progress__fill"
                                style={{ width: `${(row.valueTb / capacityTb) * 100}%`, background: row.color }}
                            />
                        </div>
                    </div>
                ))}
                <div
                    className="row between"
                    style={{
                        paddingTop: 8,
                        borderTop: '1px solid var(--border-subtle)',
                        fontSize: 12,
                    }}
                >
                    <span className="faint">합계</span>
                    <span className="mono tabular" style={{ fontWeight: 600 }}>
                        {usedTb} / {capacityTb} TB
                    </span>
                </div>
            </div>
        </div>
    );
}
