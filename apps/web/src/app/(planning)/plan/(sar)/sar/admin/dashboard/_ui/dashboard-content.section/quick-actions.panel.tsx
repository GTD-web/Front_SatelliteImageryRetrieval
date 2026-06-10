'use client';

import { useRouter } from 'next/navigation';

import { Icon } from '@/_ui/hifi';
import { useDashboardContext } from '../../_context/DashboardContext';

export function QuickActionsPanel() {
    const router = useRouter();
    const { summary } = useDashboardContext();

    return (
        <div className="card">
            <div className="card__header">
                <div className="card__title">Quick Actions</div>
            </div>
            <div className="col" style={{ padding: '4px 0' }}>
                {summary.quickActions.map((a) => (
                    <div
                        key={a.label}
                        className="between"
                        style={{
                            padding: '12px 18px',
                            borderBottom: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                        }}
                        onClick={() => router.push(a.target)}
                    >
                        <div className="row gap-3">
                            <Icon name={a.icon} size={16} style={{ color: `var(--${a.tone})` }} />
                            <span>{a.label}</span>
                        </div>
                        <div className="row gap-2">
                            <span className={`badge badge--${a.tone}`}>{a.count}</span>
                            <Icon name="chevronRight" size={12} style={{ color: 'var(--text-tertiary)' }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
