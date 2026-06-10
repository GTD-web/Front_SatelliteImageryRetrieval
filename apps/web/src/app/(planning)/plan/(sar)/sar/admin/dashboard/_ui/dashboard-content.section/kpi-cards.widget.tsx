'use client';

import { Sparkline } from '@/_ui/hifi';
import { useDashboardContext } from '../../_context/DashboardContext';
import type { DashboardUI } from '../../_mocks/dashboard.ui-interface';

/** KPI 톤별 sparkline 색상 */
function sparkColor(tone: DashboardUI.KpiTone): string {
    if (tone === 'warning') return 'var(--warning)';
    if (tone === 'up' || tone === 'down') return 'var(--success)';
    return 'var(--text-tertiary)';
}

/** KPI 톤별 delta 클래스 */
function deltaClass(tone: DashboardUI.KpiTone): string {
    if (tone === 'up') return 'kpi__delta kpi__delta--up';
    if (tone === 'down') return 'kpi__delta kpi__delta--up';
    if (tone === 'warning') return 'kpi__delta kpi__delta--down';
    return 'kpi__delta';
}

export function KpiCards() {
    const { summary } = useDashboardContext();

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {summary.kpis.map((k) => (
                <div key={k.label} className="kpi">
                    <div className="between">
                        <div className="kpi__label">{k.label}</div>
                        <Sparkline points={k.spark} color={sparkColor(k.tone)} />
                    </div>
                    <div className="kpi__value tabular">
                        {k.value}
                        {k.unit ? (
                            <span style={{ fontSize: 14, color: 'var(--text-tertiary)', marginLeft: 4 }}>{k.unit}</span>
                        ) : null}
                    </div>
                    <div className={deltaClass(k.tone)}>{k.delta}</div>
                </div>
            ))}
        </div>
    );
}
