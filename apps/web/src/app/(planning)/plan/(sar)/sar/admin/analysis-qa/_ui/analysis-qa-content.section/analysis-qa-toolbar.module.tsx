'use client';

import { Icon, InfoTip } from '@/_ui/hifi';
import { useAnalysisQaContext } from '../../_context/AnalysisQaContext';

/** 상단 툴바 — 제목/설명 + 저신뢰 배지 + 지표 설명/재계산 액션 */
export function AnalysisQaToolbar() {
    const { summary, setGlossaryOpen, 품질지표를_재계산한다 } = useAnalysisQaContext();
    const lowAlerts = summary.lowAlerts;

    return (
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
                <Icon name="shield" size={15} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 600 }}>분석 품질 · 산출물 신뢰도</span>
                <InfoTip
                    size={13}
                    text="InSAR 산출물은 변위가 커도 신뢰도가 낮을 수 있다. 코히런스·언랩·네트워크·대기영향·잔차를 합성해 '이 결과를 얼마나 믿을 수 있는가'를 정량화한다."
                />
            </div>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
                {lowAlerts > 0 ? <span className="badge badge--danger">저신뢰 {lowAlerts}건</span> : null}
                <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => setGlossaryOpen(true)}
                    data-testid="qa-glossary-btn"
                >
                    <Icon name="info" size={13} /> 지표 설명
                </button>
                <button type="button" className="btn btn--sm" onClick={() => 품질지표를_재계산한다()}>
                    <Icon name="refresh" size={13} /> 재계산
                </button>
            </div>
        </div>
    );
}
