'use client';

import { useMemo, useState } from 'react';

import { Icon, InfoTip, Modal, Sparkline, useToast } from '@/_ui/hifi';
import {
    composite,
    confidenceOf,
    GRADE_COLOR,
    GRADE_LABEL,
    METRIC_DEFS,
    QA_GLOSSARY,
    QA_PRODUCTS as PRODUCTS,
    clamp01,
    isMisleading,
    type Confidence,
    type Grade,
    type ProductType,
    type QaProduct,
} from '@/_shared/insar-qa';

// ────────────────────────────────────────────────────────────────────────────
// 분석 품질(InSAR QA) — 산출물 신뢰도 지표 (관리자)
//
// 데이터·점수 로직은 `@/_shared/insar-qa` 에서 공유한다. 이 화면은 산출물별
// 신뢰도 지표를 한눈에 보여 주고, 변위가 커도 신뢰도가 낮으면 경보로 띄운다.
// ────────────────────────────────────────────────────────────────────────────

const typeBadge = (t: ProductType) =>
    t === 'DInSAR' ? 'badge--info' : t === 'SBAS' ? 'badge--warning' : 'badge--brand2';

// ────────────────────────────────────────────────────────────────────────────
// 페이지
// ────────────────────────────────────────────────────────────────────────────

export default function AnalysisQaPage() {
    const toast = useToast();
    const [selected, setSelected] = useState('pohang-q4');
    const [typeFilter, setTypeFilter] = useState<'전체' | ProductType>('전체');
    const [glossaryOpen, setGlossaryOpen] = useState(false);

    const scored = useMemo(
        () =>
            PRODUCTS.map((p) => {
                const score = composite(p);
                return { product: p, score, conf: confidenceOf(score) };
            }),
        [],
    );

    const filtered = scored.filter((s) => typeFilter === '전체' || s.product.type === typeFilter);
    const current = scored.find((s) => s.product.id === selected) ?? scored[0]!;

    // KPI 집계
    const avgScore = scored.reduce((a, s) => a + s.score, 0) / scored.length;
    const trustable = scored.filter((s) => s.score >= 0.5).length;
    const trustPct = Math.round((trustable / scored.length) * 100);
    const lowAlerts = scored.filter((s) => s.score < 0.5).length;
    const avgUnwrap = Math.round(
        (scored.reduce((a, s) => a + s.product.metrics.connectedRatio, 0) / scored.length) * 100,
    );

    return (
        <div className="col" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
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
                    {lowAlerts > 0 ? (
                        <span className="badge badge--danger">저신뢰 {lowAlerts}건</span>
                    ) : null}
                    <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => setGlossaryOpen(true)}
                        data-testid="qa-glossary-btn"
                    >
                        <Icon name="info" size={13} /> 지표 설명
                    </button>
                    <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => toast('품질 지표 재계산됨', { tone: 'success' })}
                    >
                        <Icon name="refresh" size={13} /> 재계산
                    </button>
                </div>
            </div>

            <div className="col gap-4" style={{ padding: 24 }}>
                {/* KPI */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <Kpi
                        label="평균 신뢰도"
                        value={avgScore.toFixed(2)}
                        sub={`${scored.length}개 산출물`}
                        tone={confidenceOf(avgScore).grade}
                    />
                    <Kpi
                        label="신뢰 가능 비율"
                        value={`${trustPct}%`}
                        sub={`${trustable}/${scored.length} (점수 ≥ 0.50)`}
                        tone={trustPct >= 80 ? 'good' : trustPct >= 50 ? 'usable' : 'risk'}
                    />
                    <Kpi
                        label="평균 언랩 성공"
                        value={`${avgUnwrap}%`}
                        sub="connected component 비율"
                        tone={avgUnwrap >= 85 ? 'good' : avgUnwrap >= 60 ? 'usable' : 'risk'}
                    />
                    <Kpi
                        label="저신뢰 경보"
                        value={String(lowAlerts)}
                        sub="점수 < 0.50 — 결과 신뢰 불가"
                        tone={lowAlerts === 0 ? 'good' : 'risk'}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 12 }}>
                    {/* 산출물별 QA 테이블 */}
                    <div className="card">
                        <div className="card__header">
                            <div>
                                <div className="card__title">산출물별 신뢰도</div>
                                <div className="card__subtle">행 선택 → 우측에서 지표 상세 확인</div>
                            </div>
                            <div className="row gap-1">
                                {(['전체', 'DInSAR', 'SBAS', 'PSInSAR'] as const).map((t) => (
                                    <span
                                        key={t}
                                        className={`chip${typeFilter === t ? ' chip--active' : ''}`}
                                        onClick={() => setTypeFilter(t)}
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>산출물</th>
                                    <th>타입</th>
                                    <th className="num">LOS 속도</th>
                                    <th className="num">코히런스</th>
                                    <th className="num">신뢰도</th>
                                    <th>판정</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(({ product: p, score, conf }) => {
                                    const on = p.id === selected;
                                    return (
                                        <tr
                                            key={p.id}
                                            onClick={() => setSelected(p.id)}
                                            style={{
                                                cursor: 'pointer',
                                                background: on ? 'var(--accent-soft)' : undefined,
                                            }}
                                        >
                                            <td>
                                                <div style={{ fontWeight: 500, fontSize: 12.5 }}>{p.name}</div>
                                                <div className="mono tabular faint" style={{ fontSize: 11 }}>
                                                    {p.range}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${typeBadge(p.type)}`} style={{ fontSize: 10 }}>
                                                    {p.type}
                                                </span>
                                            </td>
                                            <td className="num mono tabular" style={{ fontWeight: 600 }}>
                                                {p.velocityMmYr > 0 ? '+' : ''}
                                                {p.velocityMmYr}
                                                <span className="faint" style={{ fontSize: 10, marginLeft: 2 }}>
                                                    mm/yr
                                                </span>
                                            </td>
                                            <td className="num mono tabular">
                                                <span style={{ color: GRADE_COLOR[METRIC_DEFS[0]!.grade(p.metrics.coherence)] }}>
                                                    {p.metrics.coherence.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="num">
                                                <ScoreBar score={score} grade={conf.grade} />
                                            </td>
                                            <td>
                                                <span
                                                    className="status"
                                                    style={{
                                                        color: GRADE_COLOR[conf.grade],
                                                        background: `color-mix(in srgb, ${GRADE_COLOR[conf.grade]} 14%, transparent)`,
                                                    }}
                                                >
                                                    {conf.band}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filtered.length === 0 ? (
                            <div className="empty" style={{ padding: 28, fontSize: 12 }}>
                                해당 타입의 산출물이 없습니다
                            </div>
                        ) : null}
                    </div>

                    {/* 선택 산출물 상세 */}
                    <DetailPanel detail={current} />
                </div>
            </div>

            {/* QA 지표 설명 — 툴바의 '지표 설명' 버튼으로 모달 오픈 */}
            {glossaryOpen ? <MetricGlossaryModal onClose={() => setGlossaryOpen(false)} /> : null}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// KPI 카드
// ────────────────────────────────────────────────────────────────────────────

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

/** 신뢰도 점수 막대 + 수치 */
function ScoreBar({ score, grade }: { score: number; grade: Grade }) {
    return (
        <div className="row gap-2" style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
            <div
                className="progress"
                style={{ width: 56, height: 6, flexShrink: 0 }}
                aria-hidden
            >
                <div
                    className="progress__fill"
                    style={{ width: `${Math.round(score * 100)}%`, background: GRADE_COLOR[grade] }}
                />
            </div>
            <span className="mono tabular" style={{ fontWeight: 600, minWidth: 30 }}>
                {score.toFixed(2)}
            </span>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 상세 패널
// ────────────────────────────────────────────────────────────────────────────

interface Detail {
    product: QaProduct;
    score: number;
    conf: Confidence;
}

function DetailPanel({ detail }: { detail: Detail }) {
    const { product: p, score, conf } = detail;
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
                    <span className="mono" style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
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

// ────────────────────────────────────────────────────────────────────────────
// QA 지표 설명 (배경 지식)
// ────────────────────────────────────────────────────────────────────────────

function MetricGlossaryModal({ onClose }: { onClose: () => void }) {
    return (
        <Modal
            title="QA 지표 설명"
            sub="운영 InSAR에서 가장 어려운 건 변위 계산보다 “언제 결과를 믿지 말아야 하는가” 판단이다"
            onClose={onClose}
            size="lg"
            footer={(close) => (
                <button type="button" className="btn btn--primary" onClick={close}>
                    닫기
                </button>
            )}
        >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                {QA_GLOSSARY.map((g) => (
                    <div
                        key={g.title}
                        className="col"
                        style={{
                            gap: 5,
                            padding: '12px 14px',
                            borderRadius: 6,
                            background: 'var(--bg-1)',
                            border: '1px solid var(--border-subtle)',
                        }}
                    >
                        <div className="row gap-2" style={{ alignItems: 'center' }}>
                            <Icon name="info" size={13} style={{ color: 'var(--accent)' }} />
                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{g.title}</span>
                        </div>
                        <span className="faint" style={{ fontSize: 11.5, lineHeight: 1.55 }}>
                            {g.body}
                        </span>
                    </div>
                ))}
            </div>
        </Modal>
    );
}
