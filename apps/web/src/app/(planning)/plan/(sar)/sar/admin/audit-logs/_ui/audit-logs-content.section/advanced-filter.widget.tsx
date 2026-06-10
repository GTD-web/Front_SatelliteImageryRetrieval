'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { Modal, useToast } from '@/_ui/hifi';
import { useAuditLogsContext } from '../../_context/AuditLogsContext';
import type { AuditLogsUI } from '../../_mocks/audit-logs.ui-interface';
import { ACTOR_TYPES, OUTCOME_OPTIONS } from '../../_constants/audit-logs-labels';
import { EMPTY_ADV, advCount, datePresets, matchesAdv } from '../../_constants/audit-logs-filter';

/**
 * 고급 필터 모달 — 기간·액터·액션·결과를 조합해 감사 로그를 좁힌다.
 *
 * 모달 내부 draft 는 로컬 폼 상태(useState)로, 적용 시점에만 Context 의 adv 로 반영한다.
 * 실시간 건수 미리보기는 서버 logs + draft 로 계산한다(검색어·카테고리 제외).
 */
export function AdvancedFilterModal() {
    const { adv, setAdv, setAdvOpen, logs, actionGroups, latestDate } = useAuditLogsContext();
    const toast = useToast();

    const [draft, setDraft] = useState<AuditLogsUI.AdvFilter>(adv);
    const liveCount = useMemo(() => logs.filter((l) => matchesAdv(l, draft)).length, [logs, draft]);
    const presets = useMemo(() => datePresets(latestDate), [latestDate]);

    const onClose = () => setAdvOpen(false);
    const onApply = () => {
        setAdv(draft);
        setAdvOpen(false);
        toast('필터가 적용되었습니다', { tone: 'success' });
    };

    const toggleActorType = (t: AuditLogsUI.ActorType) =>
        setDraft((f) => ({
            ...f,
            actorTypes: f.actorTypes.includes(t)
                ? f.actorTypes.filter((x) => x !== t)
                : [...f.actorTypes, t],
        }));
    const toggleAction = (a: string) =>
        setDraft((f) => ({
            ...f,
            actions: f.actions.includes(a) ? f.actions.filter((x) => x !== a) : [...f.actions, a],
        }));
    const setRange = (start: string, end: string) => setDraft((f) => ({ ...f, start, end }));

    const n = advCount(draft);

    return (
        <Modal
            title="고급 필터"
            sub="기간·액터·액션·결과를 조합해 감사 로그를 좁혀서 봅니다"
            onClose={onClose}
            size="lg"
            footer={
                <>
                    <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => setDraft(EMPTY_ADV)}
                        disabled={n === 0}
                        style={{ marginRight: 'auto' }}
                    >
                        초기화
                    </button>
                    <button type="button" className="btn" onClick={onClose}>
                        취소
                    </button>
                    <button type="button" className="btn btn--primary" onClick={onApply}>
                        적용 {n > 0 ? `(${n})` : ''}
                    </button>
                </>
            }
        >
            <div className="col gap-4">
                {/* 기간 */}
                <Field label="기간">
                    <div className="row gap-1" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
                        {presets.map((p) => {
                            const [s, e] = p.range();
                            const active = draft.start === s && draft.end === e;
                            return (
                                <span
                                    key={p.label}
                                    className={`chip${active ? ' chip--active' : ''}`}
                                    style={{ height: 24, fontSize: 11.5 }}
                                    onClick={() => setRange(s, e)}
                                >
                                    {p.label}
                                </span>
                            );
                        })}
                    </div>
                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <input
                            type="date"
                            className="input mono tabular"
                            style={{ flex: 1 }}
                            value={draft.start}
                            max={draft.end || undefined}
                            onChange={(e) => setDraft((f) => ({ ...f, start: e.target.value }))}
                        />
                        <span className="faint">~</span>
                        <input
                            type="date"
                            className="input mono tabular"
                            style={{ flex: 1 }}
                            value={draft.end}
                            min={draft.start || undefined}
                            onChange={(e) => setDraft((f) => ({ ...f, end: e.target.value }))}
                        />
                    </div>
                    <div className="faint" style={{ fontSize: 10.5, marginTop: 4 }}>
                        프리셋은 데모 데이터의 최신 로그일({latestDate}) 기준입니다.
                    </div>
                </Field>

                {/* 액터 유형 */}
                <Field label="액터 유형">
                    <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                        {ACTOR_TYPES.map((t) => (
                            <span
                                key={t}
                                className={`chip${draft.actorTypes.includes(t) ? ' chip--active' : ''}`}
                                onClick={() => toggleActorType(t)}
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                </Field>

                {/* 결과 */}
                <Field label="결과">
                    <div className="segmented" style={{ display: 'flex', width: '100%', maxWidth: 280 }}>
                        {OUTCOME_OPTIONS.map(([k, label]) => (
                            <button
                                key={k}
                                type="button"
                                className={draft.outcome === k ? 'active' : ''}
                                style={{ flex: 1 }}
                                onClick={() => setDraft((f) => ({ ...f, outcome: k }))}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </Field>

                {/* 액션 코드 */}
                <Field label={`액션 코드${draft.actions.length > 0 ? ` · ${draft.actions.length} 선택됨` : ''}`}>
                    <div className="col gap-3">
                        {actionGroups.map((g) => (
                            <div key={g.cat} className="col gap-2">
                                <span className="faint" style={{ fontSize: 11 }}>
                                    {g.cat}
                                </span>
                                <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                                    {g.actions.map((a) => (
                                        <span
                                            key={a}
                                            className={`chip${draft.actions.includes(a) ? ' chip--active' : ''}`}
                                            style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
                                            onClick={() => toggleAction(a)}
                                        >
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Field>

                <div className="faint" style={{ fontSize: 11.5, textAlign: 'right' }}>
                    이 고급 필터 조건에 맞는 로그{' '}
                    <b style={{ color: 'var(--text-secondary)' }}>{liveCount}</b>건
                    <span style={{ marginLeft: 4 }}>(검색어·카테고리 제외)</span>
                </div>
            </div>
        </Modal>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="col gap-2">
            <label className="field-label" style={{ margin: 0 }}>
                {label}
            </label>
            {children}
        </div>
    );
}
