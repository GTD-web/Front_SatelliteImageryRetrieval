'use client';

import { Icon } from '@/_ui/hifi';
import { useCrawlTargetsContext } from '../../_context/CrawlTargetsContext';
import { STATUS_COLOR } from '../../_constants/crawl-targets-status';

export function AoiListPanel() {
    const { aois, selected, setSelected, AOI를_크롤한다, AOI를_편집한다 } = useCrawlTargetsContext();

    return (
        <aside className="split__side split__side--left" style={{ width: 420 }}>
            <div className="card__header" style={{ padding: '14px 16px' }}>
                <div className="card__title">AOI 목록</div>
                <span className="badge badge--neutral">{aois.length}</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
                {aois.map((a) => (
                    <div
                        key={a.name}
                        className="col"
                        style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            background: selected === a.name ? 'var(--accent-soft)' : undefined,
                        }}
                        onClick={() => setSelected(a.name)}
                    >
                        <div className="between">
                            <div className="row gap-2">
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 50,
                                        background: STATUS_COLOR[a.status],
                                    }}
                                />
                                <span
                                    style={{
                                        fontWeight: 600,
                                        color: selected === a.name ? 'var(--accent)' : undefined,
                                    }}
                                >
                                    {a.name}
                                </span>
                            </div>
                            <div className="row gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                    type="button"
                                    className="btn btn--ghost btn--icon btn--sm"
                                    data-tooltip="지금 크롤"
                                    onClick={() => AOI를_크롤한다(a.name)}
                                >
                                    <Icon name="refresh" size={12} />
                                </button>
                                <button
                                    type="button"
                                    className="btn btn--ghost btn--icon btn--sm"
                                    data-tooltip="편집"
                                    onClick={() => AOI를_편집한다(a.name)}
                                >
                                    <Icon name="settings" size={12} />
                                </button>
                            </div>
                        </div>
                        <div className="row gap-3" style={{ marginTop: 6, fontSize: 12 }}>
                            <span className="faint">{a.owner}</span>
                            <span className="faint">·</span>
                            <span className="mono tabular">{a.scenes}</span>
                            <span className="faint">scenes</span>
                            <span
                                className="faint"
                                style={{
                                    marginLeft: 'auto',
                                    color:
                                        a.status === 'stale'
                                            ? 'var(--warning)'
                                            : a.status === 'failed'
                                              ? 'var(--danger)'
                                              : undefined,
                                }}
                            >
                                {a.last}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}
