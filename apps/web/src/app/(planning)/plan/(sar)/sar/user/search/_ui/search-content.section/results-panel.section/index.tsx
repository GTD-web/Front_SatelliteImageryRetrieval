'use client';

/** 하단 결과 패널 — 헤더(접기/탭/기간/선택/담기) + 결과 목록 또는 타임라인. */
import { Icon } from '@/_ui/hifi';

import { RequestTimelinePanel } from '../../../../../_components/SceneTimelinePanel';
import { useSearchContext } from '../../../_context/SearchContext';
import { fmtYmd } from '../../../_constants/search-filters';
import { ResultsFilter } from './results-filter.widget';
import { ResultsTable } from './results-table.module';

export function ResultsPanel() {
    const {
        resultsOpen,
        setResultsOpen,
        resultsTab,
        setResultsTab,
        filters,
        setFilters,
        appliedFilters,
        setAppliedFilters,
        facetCounts,
        scenes,
        checked,
        clearChecked,
        선택한_씬을_담는다,
        전체_씬을_담는다,
    } = useSearchContext();

    return (
        <div
            className="col"
            style={{
                flex: '0 0 auto',
                minHeight: 0,
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-2)',
            }}
        >
            <div
                className="results-header between"
                role="button"
                aria-expanded={resultsOpen}
                aria-label={resultsOpen ? '결과 접기' : '결과 펼치기'}
                tabIndex={0}
                onClick={() => setResultsOpen((v) => !v)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setResultsOpen((v) => !v);
                    }
                }}
                data-open={resultsOpen}
            >
                <div className="row gap-2" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <Icon
                        name="chevronDown"
                        size={13}
                        style={{
                            transition: 'transform 200ms ease',
                            transform: resultsOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                            opacity: 0.75,
                        }}
                    />
                    {/* 결과/타임라인 탭 — 행 클릭으로 collapse 되지 않도록 stopPropagation. */}
                    <div
                        role="tablist"
                        aria-label="결과 패널 탭"
                        className="row"
                        style={{ gap: 0, alignItems: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        {(
                            [
                                ['list', '결과'],
                                ['timeline', '타임라인'],
                            ] as const
                        ).map(([key, label]) => {
                            const active = resultsTab === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    className="results-tab"
                                    data-active={active}
                                    onClick={() => {
                                        setResultsTab(key);
                                        setResultsOpen(true);
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    {/* 검색 기간 — 탭바 옆에 두어 결과/타임라인 두 탭에서 모두 보이게. */}
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'baseline',
                            gap: 6,
                            marginLeft: 4,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <span className="faint" style={{ fontSize: 11 }}>
                            기간
                        </span>
                        <span className="mono tabular" style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                            {fmtYmd(filters.startDate)} ~ {fmtYmd(filters.endDate)}
                        </span>
                    </span>
                    {resultsTab === 'timeline' ? (
                        <span className="faint" style={{ fontSize: 12 }}>
                            핸들을 드래그해 검색 기간을 조정하세요
                        </span>
                    ) : null}
                    {resultsTab === 'list' && checked.size > 0 ? (
                        <>
                            <span className="faint">·</span>
                            <span className="badge badge--accent">{checked.size} 선택됨</span>
                            <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearChecked();
                                    setResultsOpen(true);
                                }}
                            >
                                선택 해제
                            </button>
                        </>
                    ) : null}
                </div>
                {/* 검색/담기 컨트롤 — 결과 탭에서만 노출. */}
                {resultsTab === 'list' ? (
                    <div
                        className="row gap-2"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        {checked.size > 0 ? (
                            <button
                                type="button"
                                className="btn btn--primary btn--sm"
                                onClick={() => {
                                    선택한_씬을_담는다();
                                    setResultsOpen(true);
                                }}
                            >
                                <Icon name="cart" size={12} /> 선택한 {checked.size}개 담기
                            </button>
                        ) : resultsOpen ? (
                            <button
                                type="button"
                                className="btn btn--sm"
                                onClick={() => {
                                    전체_씬을_담는다();
                                    setResultsOpen(true);
                                }}
                            >
                                <Icon name="cart" size={12} /> 전체 담기 ({scenes.length})
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateRows: resultsOpen ? '1fr' : '0fr',
                    transition: 'grid-template-rows 260ms ease',
                }}
                aria-hidden={!resultsOpen}
            >
                <div
                    style={{
                        minHeight: 0,
                        overflow: 'hidden',
                        // list 탭은 카드/필터를 위해 패딩, timeline 탭은 풀블리드 SVG 라 0.
                        // 닫혔을 때는 0 — grid 0fr 접힘에서 grid item 의 패딩이 잔여 높이로 남는 것을 방지.
                        padding: !resultsOpen ? 0 : resultsTab === 'list' ? '8px 12px 12px' : 0,
                    }}
                >
                    {resultsTab === 'list' ? (
                        <>
                            <ResultsFilter
                                filters={appliedFilters}
                                setFilters={setAppliedFilters}
                                facetCounts={facetCounts}
                            />
                            <ResultsTable />
                        </>
                    ) : (
                        <RequestTimelinePanel
                            showHeader={false}
                            rangeStart={filters.startDate}
                            rangeEnd={filters.endDate}
                            onRangeChange={(s, e) =>
                                setFilters((f) => ({ ...f, startDate: s, endDate: e, datePreset: '' }))
                            }
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
