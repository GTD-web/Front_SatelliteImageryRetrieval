'use client';

/**
 * 분석 신뢰도(QA) — 사용자 뷰어용 요약
 *
 * 점수·등급 로직은 관리자 분석 품질 화면과 동일한 `@/_shared/insar-qa` 를 공유한다.
 * 변위(결과)만 보고 신뢰하지 않도록 신뢰도를 함께 노출한다.
 */
import { Icon, InfoTip } from '@/_ui/hifi';
import {
    GRADE_COLOR,
    GRADE_LABEL,
    METRIC_DEFS,
    clamp01,
    isMisleading,
    qaForId,
} from '@/_shared/insar-qa';

import { Section } from '../../../../_shared';

/** 산출물 요약 행에 들어가는 한 줄짜리 신뢰도 표시. */
export function ProductConfidenceRow({ productId }: { productId: string }) {
    const qa = qaForId(productId);
    if (!qa) return null;
    const { conf, score } = qa;
    return (
        <div className="row gap-1" style={{ marginTop: 5, alignItems: 'center', fontSize: 10.5 }}>
            <span
                style={{ width: 7, height: 7, borderRadius: 50, background: GRADE_COLOR[conf.grade], flexShrink: 0 }}
            />
            <span className="faint">신뢰도</span>
            <span style={{ color: GRADE_COLOR[conf.grade], fontWeight: 600 }}>{conf.band}</span>
            <span className="mono tabular faint">{score.toFixed(2)}</span>
            {isMisleading(qa.product, conf) ? (
                <span
                    className="row gap-1"
                    style={{ marginLeft: 'auto', color: 'var(--danger)', alignItems: 'center' }}
                >
                    <Icon name="x" size={10} />
                    저신뢰
                </span>
            ) : null}
        </div>
    );
}

/** 선택된 산출물의 신뢰도 상세 — 사이드바 섹션. */
export function QaSummaryPanel({ productId }: { productId: string }) {
    const qa = qaForId(productId);
    if (!qa) return null;
    const { product, score, conf } = qa;
    const m = product.metrics;
    const metrics = METRIC_DEFS.filter((d) => !(d.skipForDinsar && product.type === 'DInSAR'));
    const misleading = isMisleading(product, conf);

    return (
        <Section
            title="분석 신뢰도"
            info={`InSAR 결과는 변위가 커도 신뢰도가 낮을 수 있습니다.\n코히런스·언랩·네트워크·대기 영향·잔차를 가중 합성한 점수입니다.\n점수가 낮으면 결과를 그대로 믿지 않는 것이 좋습니다.`}
        >
            <div className="col gap-2">
                <div className="between" style={{ alignItems: 'center' }}>
                    <span
                        className="badge"
                        style={{
                            color: GRADE_COLOR[conf.grade],
                            background: `color-mix(in srgb, ${GRADE_COLOR[conf.grade]} 14%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${GRADE_COLOR[conf.grade]} 35%, transparent)`,
                            fontWeight: 600,
                        }}
                    >
                        신뢰도 {conf.band}
                    </span>
                    <span className="row gap-2" style={{ alignItems: 'center' }}>
                        <div className="progress" style={{ width: 56, height: 6 }} aria-hidden>
                            <div
                                className="progress__fill"
                                style={{ width: `${Math.round(score * 100)}%`, background: GRADE_COLOR[conf.grade] }}
                            />
                        </div>
                        <span className="mono tabular" style={{ fontWeight: 600, fontSize: 12 }}>
                            {score.toFixed(2)}
                        </span>
                    </span>
                </div>

                {misleading ? (
                    <div
                        className="row gap-2"
                        style={{
                            padding: '8px 10px',
                            borderRadius: 5,
                            background: 'var(--danger-soft)',
                            border: '1px solid var(--danger-soft)',
                            alignItems: 'flex-start',
                        }}
                    >
                        <Icon name="x" size={12} style={{ color: 'var(--danger)', marginTop: 1, flexShrink: 0 }} />
                        <span style={{ fontSize: 10.5, lineHeight: 1.45, color: 'var(--danger)' }}>
                            변위 {Math.abs(product.velocityMmYr)}mm/yr 로 크지만 코히런스 붕괴·언랩 오류로{' '}
                            <InfoTip
                                trigger="hover"
                                placement="top"
                                text="artifact(허상)는 실제 지표 변위가 아니라 코히런스 저하·위상 언랩 오류 등 처리 과정에서 생긴 가짜 신호입니다. 진짜 침하/융기로 해석하면 안 됩니다."
                            >
                                artifact
                            </InfoTip>
                            일 가능성이 높습니다. 결과 해석에 주의하세요.
                        </span>
                    </div>
                ) : null}

                <div className="col gap-2" style={{ marginTop: 2 }}>
                    {metrics.map((d) => {
                        const raw = m[d.key] as number;
                        const g = d.grade(raw);
                        return (
                            <div key={d.key} className="col" style={{ gap: 3 }}>
                                <div className="between" style={{ fontSize: 11 }}>
                                    <span className="row" style={{ alignItems: 'center', gap: 4 }}>
                                        <span
                                            style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: 50,
                                                background: GRADE_COLOR[g],
                                                flexShrink: 0,
                                            }}
                                        />
                                        {d.label}
                                        <InfoTip
                                            text={`${d.info.replace(/\. /g, '.\n')}\n\n기준\n${d.rule
                                                .split(' · ')
                                                .map((r) => `• ${r}`)
                                                .join('\n')}`}
                                            size={10}
                                        />
                                    </span>
                                    <span className="mono tabular" style={{ fontWeight: 600 }}>
                                        {d.fmt(raw)}
                                    </span>
                                </div>
                                <div className="progress" style={{ height: 4 }}>
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
                <span className="faint" style={{ fontSize: 10, lineHeight: 1.4 }}>
                    {GRADE_LABEL.good} / {GRADE_LABEL.usable} / {GRADE_LABEL.risk} 기준은 각 지표 ⓘ 참조
                </span>
            </div>
        </Section>
    );
}
