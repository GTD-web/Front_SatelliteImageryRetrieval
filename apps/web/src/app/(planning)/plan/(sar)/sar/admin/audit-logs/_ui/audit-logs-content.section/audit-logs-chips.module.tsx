'use client';

import { Icon } from '@/_ui/hifi';
import { useAuditLogsContext } from '../../_context/AuditLogsContext';

/** 적용된 고급 필터를 제거 가능한 칩 줄로 표시한다. 칩이 없으면 렌더하지 않는다. */
export function AuditLogsChips() {
    const { advChips, clearAdv } = useAuditLogsContext();

    if (advChips.length === 0) return null;

    return (
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
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearAdv}>
                전체 해제
            </button>
        </div>
    );
}
