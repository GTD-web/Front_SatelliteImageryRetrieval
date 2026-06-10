'use client';

import { Icon } from '@/_ui/hifi';
import { useInsarResultsContext } from '../../../_context/InsarResultsContext';
import { ProductSummaryPanel } from './product-summary.panel';
import { ProductStatsPanel } from './product-stats.panel';
import { QaSummaryPanel } from './qa-summary.panel';

/** 결과 뷰어 좌측 사이드바 — 타입 필터 + 산출물 선택/요약 + 핵심 지표 + 신뢰도 + 액션. */
export function ResultsSidebar() {
    const {
        filtered,
        allCount,
        typeFilter,
        setTypeFilter,
        selected,
        setSelected,
        current,
        setShowScenes,
        산출물을_다운로드한다,
    } = useInsarResultsContext();

    if (!current) {
        return (
            <aside
                className="split__side split__side--left"
                style={{ width: 320, display: 'flex', flexDirection: 'column' }}
            >
                <div className="empty" style={{ padding: 18, fontSize: 12 }}>
                    산출물을 불러오는 중…
                </div>
            </aside>
        );
    }

    return (
        <aside
            className="split__side split__side--left"
            style={{ width: 320, display: 'flex', flexDirection: 'column' }}
        >
            <div className="toolbar" style={{ borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                    {(['전체', 'DInSAR', 'SBAS', 'PSInSAR'] as const).map((t) => (
                        <span
                            key={t}
                            className={`chip${typeFilter === t ? ' chip--active' : ''}`}
                            onClick={() => setTypeFilter(t)}
                        >
                            {t}
                        </span>
                    ))}
                    <span className="faint mono tabular" style={{ fontSize: 11, marginLeft: 'auto' }}>
                        {filtered.length}/{allCount}
                    </span>
                </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <ProductSummaryPanel
                    products={filtered}
                    selected={selected}
                    onSelect={setSelected}
                    currentProduct={current}
                />

                <ProductStatsPanel product={current} />

                <QaSummaryPanel productId={current.id} />
            </div>

            <div
                style={{
                    flexShrink: 0,
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-1)',
                    padding: 12,
                }}
            >
                <div className="mono faint" style={{ fontSize: 11, marginBottom: 8, lineHeight: 1.45 }}>
                    {current.name} · {current.scenes} scenes · LOS inc=39.2°
                </div>
                <div className="row gap-2">
                    <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => setShowScenes(true)}
                        style={{ flex: 1 }}
                    >
                        원본 scene
                    </button>
                    <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => 산출물을_다운로드한다(current.id)}
                        style={{ flex: 1 }}
                    >
                        <Icon name="download" size={13} /> 다운로드
                    </button>
                </div>
            </div>
        </aside>
    );
}
