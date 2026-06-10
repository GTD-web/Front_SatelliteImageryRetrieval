'use client';

import { Icon, InfoTip, Sparkline } from '@/_ui/hifi';
import {
    clamp01,
    GRADE_COLOR,
    GRADE_LABEL,
    isMisleading,
    METRIC_DEFS,
} from '@/_shared/insar-qa';
import { useAnalysisQaContext } from '../../_context/AnalysisQaContext';

/** 선택 산출물 상세 — 변위 vs 신뢰도, 지표 막대, 합성 공식 */
export function DetailPanel() {
    const { current } = useAnalysisQaContext();
    if (current == null) return null;

    const { product: p, score, conf } = current;
    const m = p.metrics;
    const metrics = METRIC_DEFS.filter((d) => !(d.skipForDinsar && p.type === 'DInSAR'));

    // 변위는 크지만 신뢰도가 낮은 경우(운영에서 가장 위험한 착각)
    const misleading = isMisleading(p, conf);

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card__header">
                <div>
                    <div className="card__title">{p.name}</div>
                    <div className="card__subtle">
                        {p.type} · {p.mission} · 처리 {p.processed}
                    </div>
                </div>
                <span
                    className="badge"
                    style={{
                        color: GRADE_COLOR[conf.grade],
                        background: `color-mix(in srgb, ${GRADE_COLOR[conf.grade]} 14%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${GRADE_COLOR[conf.grade]} 35%, transparent)`,
                        fontWeight: 600,
                    }}
                >
                    신뢰도 {conf.band} · {score.toFixed(2)}
                </span>
            </div>

            <div className="card__body col gap-3" style={{ paddingTop: 12 }}>
                {/* 변위 vs 신뢰도 요약 */}
                <div
                    className="row between"
                    style={{
                        padding: '10px 12px',
                        borderRadius: 6,
                        background: 'var(--bg-3)',
                        border: '1px solid var(--border-subtle)',
                    }}
                >
                    <div className="col" style={{ gap: 1 }}>
                        <span className="faint" style={{ fontSize: 10.5 }}>
                            LOS 평균 속도
                        </span>
                        <span className="mono tabular" style={{ fontSize: 18, fontWeight: 700 }}>
                            {p.velocityMmYr > 0 ? '+' : ''}
                            {p.velocityMmYr}
                            <span className="faint" style={{ fontSize: 11, marginLeft: 3 }}>
                                mm/yr
                            </span>
                        </span>
                    </div>
                    <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
                        <span className="faint" style={{ fontSize: 10.5 }}>
                            시계열 코히런스 추이
                        </span>
                        <Sparkline
                            points={m.coherenceTrend}
                            color={GRADE_COLOR[METRIC_DEFS[1]!.grade(m.temporalCoherence)]}
                            w={120}
                            h={26}
                        />
                    </div>
                </div>

                {misleading ? (
                    <div
                        className="row gap-2"
                        style={{
                            padding: '9px 11px',
                            borderRadius: 6,
                            background: 'var(--danger-soft)',
                            border: '1px solid var(--danger-soft)',
                            alignItems: 'flex-start',
                        }}
                    >
                        <Icon name="x" size={14} style={{ color: 'var(--danger)', marginTop: 1 }} />
                        <div className="col" style={{ gap: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)' }}>
                                큰 변위 — 그러나 결과 신뢰 불가
                            </span>
                            <span className="faint" style={{ fontSize: 11, lineHeight: 1.45 }}>
                                {Math.abs(p.velocityMmYr)}mm/yr 로 크게 나왔으나 코히런스 붕괴·언랩 오류로 실제
                                침하가 아닌{' '}
                                <InfoTip
                                    trigger="hover"
                                    placement="top"
                                    text="artifact(허상): 실제 지표 변위가 아니라 코히런스 저하·위상 언랩 오류 등 처리 과정에서 생긴 가짜 신호. 진짜 침하/융기로 해석하면 안 됩니다."
                                >
                                    artifact
                                </InfoTip>
                                일 가능성이 높다. 경보 전 재처리 권장.
                            </span>
                        </div>
                    </div>
                ) : null}

                {/* 지표 막대 */}
                <div className="col gap-3" style={{ marginTop: 2 }}>
                    {metrics.map((d) => {
                        const raw = m[d.key] as number;
                        const g = d.grade(raw);
                        return (
                            <div key={d.key} className="col" style={{ gap: 4 }}>
                                <div className="between" style={{ fontSize: 12 }}>
                                    <span className="row" style={{ alignItems: 'center', gap: 5 }}>
                                        {d.label}
                                        <InfoTip text={`${d.info}\n\n기준: ${d.rule}`} size={11} />
                                    </span>
                                    <span className="row gap-2" style={{ alignItems: 'center' }}>
                                        <span className="mono tabular" style={{ fontWeight: 600 }}>
                                            {d.fmt(raw)}
                                        </span>
                                        <span
                                            className="badge"
                                            style={{
                                                fontSize: 9.5,
                                                color: GRADE_COLOR[g],
                                                background: `color-mix(in srgb, ${GRADE_COLOR[g]} 14%, transparent)`,
                                            }}
                                        >
                                            {GRADE_LABEL[g]}
                                        </span>
                                    </span>
                                </div>
                                <div className="progress" style={{ height: 6 }}>
                                    <div
                                        className="progress__fill"
                                        style={{
                                            width: `${Math.round(clamp01(d.norm(raw)) * 100)}%`,
                                            background: GRADE_COLOR[g],
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 합성 공식 */}
                <div
                    className="col"
                    style={{
                        gap: 4,
                        marginTop: 4,
                        padding: '10px 12px',
                        borderRadius: 6,
                        background: 'var(--bg-1)',
                        border: '1px solid var(--border-subtle)',
                    }}
                >
                    <span className="faint" style={{ fontSize: 10.5 }}>
                        합성 신뢰도 공식
                    </span>
                    <span
                        className="mono"
                        style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)' }}
                    >
                        QA = 0.30·코히런스 + 0.25·언랩 + 0.20·네트워크 + 0.15·(1−APS) + 0.10·(1−잔차/8)
                    </span>
                    {p.type === 'DInSAR' ? (
                        <span className="faint" style={{ fontSize: 10.5, lineHeight: 1.4 }}>
                            * DInSAR 단일 페어는 네트워크 항(0.20)을 제외하고 나머지 가중치를 재정규화한다.
                        </span>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
