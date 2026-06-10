'use client';

import { Icon } from '@/_ui/hifi';
import { useAuditLogsContext } from '../../_context/AuditLogsContext';
import { CATEGORY_TABS } from '../../_constants/audit-logs-labels';

export function AuditLogsToolbar() {
    const { q, setQ, cat, setCat, adv, setAdvOpen, nAdv, filtered, 감사_로그를_CSV로_내보낸다 } =
        useAuditLogsContext();

    return (
        <div className="toolbar">
            <input
                className="input input--search"
                placeholder="액터 / 대상 / 액션 검색…"
                style={{ width: 280 }}
                value={q}
                onChange={(e) => setQ(e.target.value)}
            />
            <div className="row gap-1">
                {CATEGORY_TABS.map((c) => (
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
                <button type="button" className="btn btn--sm" onClick={() => void 감사_로그를_CSV로_내보낸다(filtered)}>
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
    );
}
