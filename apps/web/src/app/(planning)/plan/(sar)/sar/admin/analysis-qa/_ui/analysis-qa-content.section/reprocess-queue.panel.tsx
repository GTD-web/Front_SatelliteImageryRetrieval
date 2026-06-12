'use client';

import { useState } from 'react';

import { Icon, useConfirm } from '@/_ui/hifi';
import { GRADE_COLOR } from '@/_shared/insar-qa';
import { useAnalysisQaContext } from '../../_context/AnalysisQaContext';
import { typeBadge } from '../../_constants/analysis-qa-labels';
import type { AnalysisQaUI } from '../../_mocks/analysis-qa.ui-interface';

/** 재처리 권장 큐 — 저신뢰/위험 산출물 worklist */
export function ReprocessQueue() {
    const { summary, setSelected, 산출물을_재처리한다 } = useAnalysisQaContext();
    const confirm = useConfirm();
    // 재처리 요청이 진행 중인 산출물 이름 — 버튼 비활성화로 중복 enqueue 방지
    const [pending, setPending] = useState<Set<string>>(new Set());
    const items = summary.worklist;

    // 비용이 큰 InSAR 재처리이므로 한 번 더 확인한 뒤에만 큐에 추가한다.
    const 재처리를_시도한다 = async (item: AnalysisQaUI.WorkItem) => {
        const { product: p, score, riskMetrics } = item;
        const riskText = riskMetrics.length > 0 ? riskMetrics.map((d) => d.label).join(', ') : '종합 점수 낮음';
        const ok = await confirm({
            title: `${p.name} 재처리`,
            sub: `${p.type} · 신뢰도 ${score.toFixed(2)}`,
            body: (
                <>
                    <div>
                        위험 지표: <b style={{ color: 'var(--danger)' }}>{riskText}</b>
                    </div>
                    <div style={{ marginTop: 8 }}>
                        동일 파라미터로 재처리 잡을 큐에 추가합니다. InSAR 재처리는 시간·연산 비용이 큰 작업입니다.
                        계속하시겠습니까?
                    </div>
                </>
            ),
            confirmLabel: '재처리 큐에 추가',
            cancelLabel: '취소',
        });
        if (!ok) return;

        setPending((s) => new Set(s).add(p.name));
        try {
            await 산출물을_재처리한다(p.name);
        } finally {
            setPending((s) => {
                const next = new Set(s);
                next.delete(p.name);
                return next;
            });
        }
    };

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card__header">
                <div>
                    <div className="card__title">재처리 권장 큐</div>
                    <div className="card__subtle">저신뢰(점수 &lt; 0.50) 또는 위험 지표가 있는 산출물</div>
                </div>
                <span className={`badge ${items.length > 0 ? 'badge--danger' : 'badge--neutral'}`}>
                    {items.length}건
                </span>
            </div>
            <div className="card__body col gap-2" style={{ paddingTop: 12 }}>
                {items.length === 0 ? (
                    <div className="row gap-2" style={{ alignItems: 'center', padding: '8px 2px' }}>
                        <Icon name="check" size={15} style={{ color: 'var(--success)' }} />
                        <span className="faint" style={{ fontSize: 12.5 }}>
                            재처리가 필요한 산출물이 없습니다 — 모든 산출물이 신뢰 가능합니다.
                        </span>
                    </div>
                ) : (
                    items.map((item) => {
                        const { product: p, score, conf, riskMetrics } = item;
                        const busy = pending.has(p.name);
                        return (
                            <div
                                key={p.id}
                                className="row between"
                                onClick={() => setSelected(p.id)}
                                style={{
                                    gap: 10,
                                    padding: '9px 11px',
                                    borderRadius: 6,
                                    background: 'var(--bg-1)',
                                    border: '1px solid var(--border-subtle)',
                                    cursor: 'pointer',
                                }}
                            >
                                <div className="col" style={{ gap: 4, minWidth: 0, flex: 1 }}>
                                    <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                                        <span className={`badge ${typeBadge(p.type)}`} style={{ fontSize: 9.5 }}>
                                            {p.type}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 12.5,
                                                fontWeight: 500,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {p.name}
                                        </span>
                                    </div>
                                    <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                                        {riskMetrics.length === 0 ? (
                                            <span
                                                className="badge"
                                                style={{
                                                    fontSize: 9.5,
                                                    color: 'var(--danger)',
                                                    background: 'color-mix(in srgb, var(--danger) 14%, transparent)',
                                                }}
                                            >
                                                종합 점수 낮음
                                            </span>
                                        ) : (
                                            riskMetrics.map((d) => (
                                                <span
                                                    key={d.key}
                                                    className="badge"
                                                    style={{
                                                        fontSize: 9.5,
                                                        color: 'var(--danger)',
                                                        background:
                                                            'color-mix(in srgb, var(--danger) 14%, transparent)',
                                                    }}
                                                >
                                                    {d.label}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="col" style={{ alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                                    <span
                                        className="mono tabular"
                                        style={{ fontSize: 13, fontWeight: 700, color: GRADE_COLOR[conf.grade] }}
                                    >
                                        {score.toFixed(2)}
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn--outline-accent btn--sm"
                                        disabled={busy}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void 재처리를_시도한다(item);
                                        }}
                                    >
                                        <Icon name="refresh" size={11} /> {busy ? '처리 중…' : '재처리'}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
