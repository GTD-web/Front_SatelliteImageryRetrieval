'use client';

import { GRADE_COLOR, METRIC_DEFS, type Grade } from '@/_shared/insar-qa';
import { useAnalysisQaContext } from '../../_context/AnalysisQaContext';
import { TYPE_FILTER_OPTIONS, typeBadge } from '../../_constants/analysis-qa-labels';

/** 신뢰도 점수 막대 + 수치 */
function ScoreBar({ score, grade }: { score: number; grade: Grade }) {
    return (
        <div className="row gap-2" style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
            <div className="progress" style={{ width: 56, height: 6, flexShrink: 0 }} aria-hidden>
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

/** 산출물별 신뢰도 테이블 — 행 선택 시 우측 상세로 연동 */
export function QaTable() {
    const { filtered, selected, setSelected, typeFilter, setTypeFilter } = useAnalysisQaContext();

    return (
        <div className="card">
            <div className="card__header">
                <div>
                    <div className="card__title">산출물별 신뢰도</div>
                    <div className="card__subtle">행 선택 → 우측에서 지표 상세 확인</div>
                </div>
                <div className="row gap-1">
                    {TYPE_FILTER_OPTIONS.map((t) => (
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
                        <th>기간</th>
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
                                </td>
                                <td className="mono tabular faint" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                                    {p.range}
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
                                    <span
                                        style={{ color: GRADE_COLOR[METRIC_DEFS[0]!.grade(p.metrics.coherence)] }}
                                    >
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
    );
}
