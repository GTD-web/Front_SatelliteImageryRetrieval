'use client';

import { InfoTip } from '@/_ui/hifi';
import { GRADE_COLOR, GRADE_LABEL } from '@/_shared/insar-qa';
import { useAnalysisQaContext } from '../../_context/AnalysisQaContext';

/** 포트폴리오 지표 프로파일 — 전체 평균으로 약한 품질 축 파악 */
export function MetricProfile() {
    const { summary } = useAnalysisQaContext();
    const profile = summary.profile;

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card__header">
                <div>
                    <div className="card__title">포트폴리오 지표 프로파일</div>
                    <div className="card__subtle">전체 산출물 평균 — 어떤 품질 축이 약한지</div>
                </div>
            </div>
            <div className="card__body col gap-3" style={{ paddingTop: 12 }}>
                {profile.map(({ def, avg, grade, norm }) => (
                    <div key={def.key} className="col" style={{ gap: 4 }}>
                        <div className="between" style={{ fontSize: 12 }}>
                            <span className="row" style={{ alignItems: 'center', gap: 5 }}>
                                {def.label}
                                <InfoTip text={`${def.info}\n\n기준: ${def.rule}`} size={11} />
                            </span>
                            <span className="row gap-2" style={{ alignItems: 'center' }}>
                                <span className="mono tabular" style={{ fontWeight: 600 }}>
                                    {def.fmt(avg)}
                                </span>
                                <span
                                    className="badge"
                                    style={{
                                        fontSize: 9.5,
                                        color: GRADE_COLOR[grade],
                                        background: `color-mix(in srgb, ${GRADE_COLOR[grade]} 14%, transparent)`,
                                    }}
                                >
                                    {GRADE_LABEL[grade]}
                                </span>
                            </span>
                        </div>
                        <div className="progress" style={{ height: 6 }}>
                            <div
                                className="progress__fill"
                                style={{
                                    width: `${Math.round(norm * 100)}%`,
                                    background: GRADE_COLOR[grade],
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
