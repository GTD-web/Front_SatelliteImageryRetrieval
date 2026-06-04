'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { Icon, Modal, useToast } from '@/_ui/hifi';

interface Log {
    ts: string;
    actor: string;
    action: string;
    target: string;
    ip: string;
    cat: '로그인' | '다운로드' | '승인' | '시스템';
}

const LOGS: Log[] = [
    { ts: '2026-04-24 09:42:18', actor: 'kim@ksit.re.kr', action: 'DOWNLOAD_COMPLETE', target: 'job-58817', ip: '10.0.12.34', cat: '다운로드' },
    { ts: '2026-04-24 09:42:02', actor: 'park@ksit.re.kr', action: 'CART_SUBMIT', target: '148 scenes · req-221', ip: '10.0.12.58', cat: '다운로드' },
    { ts: '2026-04-24 09:38:14', actor: 'admin:hong', action: 'USER_APPROVE', target: 'choi@univ.ac.kr → viewer', ip: '10.0.11.2', cat: '승인' },
    { ts: '2026-04-24 09:30:44', actor: 'admin:hong', action: 'APPROVAL_APPROVE', target: 'req-218', ip: '10.0.11.2', cat: '승인' },
    { ts: '2026-04-24 09:22:18', actor: 'lee@labs.kr', action: 'LOGIN', target: '—', ip: '203.45.22.8', cat: '로그인' },
    { ts: '2026-04-24 09:15:00', actor: 'system', action: 'SYNC_FAILED', target: 'Seoul_metro · ESA 503', ip: '—', cat: '시스템' },
    {
        ts: '2026-04-24 08:45:32',
        actor: 'admin:hong',
        action: 'ROLE_CHANGE',
        target: 'jung@ksit.re.kr: viewer → downloader',
        ip: '10.0.11.2',
        cat: '승인',
    },
    { ts: '2026-04-24 08:12:04', actor: 'yoon@ksit.re.kr', action: 'LOGIN_FAILED', target: 'password mismatch', ip: '118.44.12.9', cat: '로그인' },
];

const actionColor = (a: string) =>
    a.includes('FAIL')
        ? 'var(--danger)'
        : a.includes('APPROVE') || a.includes('COMPLETE')
          ? 'var(--success)'
          : a.includes('LOGIN')
            ? 'var(--info)'
            : 'var(--text-secondary)';

// ── 고급 필터 ────────────────────────────────────────────────────────────────

type ActorType = '사용자' | '관리자' | '시스템';
const ACTOR_TYPES: ActorType[] = ['사용자', '관리자', '시스템'];

/** 액터 문자열 → 유형. admin:* 은 관리자, system 은 시스템, 그 외는 사용자. */
const actorTypeOf = (actor: string): ActorType =>
    actor.startsWith('admin') ? '관리자' : actor === 'system' ? '시스템' : '사용자';

const isFail = (action: string) => action.includes('FAIL');

type Outcome = 'all' | 'success' | 'fail';

interface AdvFilter {
    /** 'YYYY-MM-DD' (포함). 빈 문자열이면 제한 없음. */
    start: string;
    end: string;
    /** 비어 있으면 전체. */
    actorTypes: ActorType[];
    /** 비어 있으면 전체. */
    actions: string[];
    outcome: Outcome;
}

const EMPTY_ADV: AdvFilter = { start: '', end: '', actorTypes: [], actions: [], outcome: 'all' };

/** 데모 데이터의 최신 로그 날짜 — 기간 프리셋의 기준점(오늘 대신)으로 써서 목업에서도 결과가 보이게 한다. */
const LATEST_DATE = LOGS.reduce(
    (m, l) => (l.ts.slice(0, 10) > m ? l.ts.slice(0, 10) : m),
    LOGS[0]!.ts.slice(0, 10),
);

function shiftDays(ymd: string, days: number): string {
    const d = new Date(`${ymd}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

/** 카테고리별 액션 코드 목록 — 고급 필터 액션 선택 UI 를 그룹핑하는 데 쓴다. */
const ACTIONS_BY_CAT: Array<{ cat: Log['cat']; actions: string[] }> = (() => {
    const order: Log['cat'][] = ['로그인', '다운로드', '승인', '시스템'];
    return order
        .map((cat) => ({
            cat,
            actions: [...new Set(LOGS.filter((l) => l.cat === cat).map((l) => l.action))],
        }))
        .filter((g) => g.actions.length > 0);
})();

const advCount = (f: AdvFilter): number =>
    (f.start || f.end ? 1 : 0) + f.actorTypes.length + f.actions.length + (f.outcome !== 'all' ? 1 : 0);

/** 고급 필터 술어 — 페이지 목록 필터와 모달 실시간 건수에서 함께 쓴다. */
function matchesAdv(l: Log, f: AdvFilter): boolean {
    const day = l.ts.slice(0, 10);
    if (f.start && day < f.start) return false;
    if (f.end && day > f.end) return false;
    if (f.actorTypes.length > 0 && !f.actorTypes.includes(actorTypeOf(l.actor))) return false;
    if (f.actions.length > 0 && !f.actions.includes(l.action)) return false;
    if (f.outcome === 'fail' && !isFail(l.action)) return false;
    if (f.outcome === 'success' && isFail(l.action)) return false;
    return true;
}

export default function AuditLogsPage() {
    const toast = useToast();
    const [q, setQ] = useState('');
    const [cat, setCat] = useState<'전체' | Log['cat']>('전체');
    const [adv, setAdv] = useState<AdvFilter>(EMPTY_ADV);
    const [advOpen, setAdvOpen] = useState(false);

    const filtered = useMemo(
        () =>
            LOGS.filter((l) => {
                if (cat !== '전체' && l.cat !== cat) return false;
                if (
                    q &&
                    !l.actor.toLowerCase().includes(q.toLowerCase()) &&
                    !l.target.toLowerCase().includes(q.toLowerCase()) &&
                    !l.action.toLowerCase().includes(q.toLowerCase())
                )
                    return false;
                if (!matchesAdv(l, adv)) return false;
                return true;
            }),
        [q, cat, adv],
    );

    const nAdv = advCount(adv);
    /** 적용된 고급 필터를 제거 가능한 칩 목록으로 변환. */
    const advChips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (adv.start || adv.end) {
        advChips.push({
            key: 'range',
            label: `기간: ${adv.start || '처음'} ~ ${adv.end || '끝'}`,
            onRemove: () => setAdv((f) => ({ ...f, start: '', end: '' })),
        });
    }
    adv.actorTypes.forEach((t) =>
        advChips.push({
            key: `actor-${t}`,
            label: `액터: ${t}`,
            onRemove: () => setAdv((f) => ({ ...f, actorTypes: f.actorTypes.filter((x) => x !== t) })),
        }),
    );
    adv.actions.forEach((a) =>
        advChips.push({
            key: `action-${a}`,
            label: a,
            onRemove: () => setAdv((f) => ({ ...f, actions: f.actions.filter((x) => x !== a) })),
        }),
    );
    if (adv.outcome !== 'all') {
        advChips.push({
            key: 'outcome',
            label: adv.outcome === 'fail' ? '실패만' : '성공만',
            onRemove: () => setAdv((f) => ({ ...f, outcome: 'all' })),
        });
    }

    const exportCsv = () => {
        const header = 'ts,actor,action,target,ip\n';
        const rows = filtered.map((l) => `${l.ts},${l.actor},${l.action},"${l.target}",${l.ip}`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast(`${filtered.length}건 CSV로 내보냄`, { tone: 'success' });
    };

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <div className="toolbar">
                <input
                    className="input input--search"
                    placeholder="액터 / 대상 / 액션 검색…"
                    style={{ width: 280 }}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
                <div className="row gap-1">
                    {(['전체', '로그인', '다운로드', '승인', '시스템'] as const).map((c) => (
                        <span
                            key={c}
                            className={`chip${cat === c ? ' chip--active' : ''}`}
                            onClick={() => setCat(c)}
                        >
                            {c}
                        </span>
                    ))}
                </div>
                <div className="row gap-2" style={{ marginLeft: 'auto', alignItems: 'center' }}>
                    <button
                        type="button"
                        className="btn btn--sm mono tabular"
                        style={{ minWidth: 180, justifyContent: 'flex-start' }}
                        onClick={() => setAdvOpen(true)}
                        data-tooltip="기간 설정"
                    >
                        <Icon name="calendar" size={12} style={{ marginRight: 6, opacity: 0.6 }} />
                        {adv.start || adv.end ? `${adv.start || '처음'} ~ ${adv.end || '끝'}` : '전체 기간'}
                    </button>
                    <button type="button" className="btn btn--sm" onClick={exportCsv}>
                        <Icon name="download" size={12} /> CSV
                    </button>
                    <button
                        type="button"
                        className={`btn btn--sm${nAdv > 0 ? ' btn--outline-accent' : ''}`}
                        onClick={() => setAdvOpen(true)}
                        data-testid="audit-advanced-filter-btn"
                    >
                        <Icon name="filter" size={13} /> 고급 필터
                        {nAdv > 0 ? (
                            <span className="badge badge--accent" style={{ marginLeft: 6, padding: '0 6px' }}>
                                {nAdv}
                            </span>
                        ) : null}
                    </button>
                </div>
            </div>
            {advChips.length > 0 ? (
                <div
                    className="row gap-2"
                    style={{
                        padding: '8px 16px',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: 'var(--bg-1)',
                    }}
                >
                    <span className="faint" style={{ fontSize: 11.5 }}>
                        적용된 필터
                    </span>
                    {advChips.map((c) => (
                        <span
                            key={c.key}
                            className="chip chip--active"
                            style={{ gap: 6, alignItems: 'center' }}
                            onClick={c.onRemove}
                            role="button"
                            title="제거"
                        >
                            {c.label}
                            <Icon name="x" size={10} />
                        </span>
                    ))}
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setAdv(EMPTY_ADV)}
                    >
                        전체 해제
                    </button>
                </div>
            ) : null}
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                <div className="card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: 180 }}>시각</th>
                                <th>액터</th>
                                <th>액션</th>
                                <th>대상</th>
                                <th>IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="empty" style={{ padding: 40 }}>
                                        일치하는 로그가 없습니다
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((l, i) => (
                                    <tr key={i}>
                                        <td className="mono tabular faint" style={{ fontSize: 11.5 }}>
                                            {l.ts}
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    l.actor.startsWith('admin')
                                                        ? 'badge badge--brand2'
                                                        : l.actor === 'system'
                                                          ? 'badge badge--neutral'
                                                          : ''
                                                }
                                            >
                                                {l.actor}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className="mono"
                                                style={{ fontSize: 11.5, fontWeight: 600, color: actionColor(l.action) }}
                                            >
                                                {l.action}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12.5 }}>{l.target}</td>
                                        <td className="mono tabular faint" style={{ fontSize: 11.5 }}>
                                            {l.ip}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {advOpen ? (
                <AdvancedFilterModal
                    initial={adv}
                    onApply={(f) => {
                        setAdv(f);
                        setAdvOpen(false);
                        toast('필터가 적용되었습니다', { tone: 'success' });
                    }}
                    onClose={() => setAdvOpen(false)}
                />
            ) : null}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// 고급 필터 모달
// ────────────────────────────────────────────────────────────────────────────

const DATE_PRESETS: Array<{ label: string; range: () => [string, string] }> = [
    { label: '당일', range: () => [LATEST_DATE, LATEST_DATE] },
    { label: '최근 7일', range: () => [shiftDays(LATEST_DATE, -6), LATEST_DATE] },
    { label: '최근 30일', range: () => [shiftDays(LATEST_DATE, -29), LATEST_DATE] },
    { label: '전체', range: () => ['', ''] },
];

function AdvancedFilterModal({
    initial,
    onApply,
    onClose,
}: {
    initial: AdvFilter;
    onApply: (f: AdvFilter) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState<AdvFilter>(initial);
    // 검색어/카테고리는 제외하고 '고급 필터 조건' 기준으로만 실시간 건수 미리보기.
    const liveCount = useMemo(() => LOGS.filter((l) => matchesAdv(l, draft)).length, [draft]);

    const toggleActorType = (t: ActorType) =>
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
                    <button type="button" className="btn btn--primary" onClick={() => onApply(draft)}>
                        적용 {n > 0 ? `(${n})` : ''}
                    </button>
                </>
            }
        >
            <div className="col gap-4">
                {/* 기간 */}
                <Field label="기간">
                    <div className="row gap-1" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
                        {DATE_PRESETS.map((p) => {
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
                        프리셋은 데모 데이터의 최신 로그일({LATEST_DATE}) 기준입니다.
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
                        {(
                            [
                                ['all', '전체'],
                                ['success', '성공만'],
                                ['fail', '실패만'],
                            ] as const
                        ).map(([k, label]) => (
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
                        {ACTIONS_BY_CAT.map((g) => (
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
