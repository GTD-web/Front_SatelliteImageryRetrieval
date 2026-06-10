'use client';

import { GRADE_COLOR, type Grade } from '@/_shared/insar-qa';
import { useAnalysisQaContext } from '../../_context/AnalysisQaContext';

/** 단일 KPI 카드 */
function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: Grade }) {
    return (
        <div className="kpi">
            <div className="between">
                <div className="kpi__label">{label}</div>
                <span
                    className="dot"
                    style={{ background: GRADE_COLOR[tone], width: 8, height: 8, borderRadius: 50 }}
                />
            </div>
            <div className="kpi__value tabular" style={{ color: GRADE_COLOR[tone] }}>
                {value}
            </div>
            <div className="kpi__delta faint">{sub}</div>
        </div>
    );
}

/** KPI 4종 그리드 */
export function QaKpiCards() {
    const { summary } = useAnalysisQaContext();

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {summary.kpis.map((k) => (
                <Kpi key={k.label} label={k.label} value={k.value} sub={k.sub} tone={k.tone} />
            ))}
        </div>
    );
}
