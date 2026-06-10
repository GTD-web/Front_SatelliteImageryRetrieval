'use client';

/** 결과 패널의 quick-filter 행 — 미션/제품/편광별 카운트 칩. 사이드바(적용) 필터 상태와 동기화. */
import type { Dispatch, SetStateAction } from 'react';

import type { SearchUI } from '../../../_mocks/search.ui-interface';
import { S1_POLS } from '../../../_constants/search-platforms';
import { FilterChip, FilterGroup, Sep } from '../shared.widget';

export function ResultsFilter({
    filters,
    setFilters,
    facetCounts,
}: {
    filters: SearchUI.Filters;
    setFilters: Dispatch<SetStateAction<SearchUI.Filters>>;
    facetCounts: Record<string, number>;
}) {
    return (
        <div
            className="row"
            style={{
                marginBottom: 8,
                padding: '6px 12px',
                background: 'var(--bg-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                flexWrap: 'wrap',
                gap: 10,
                alignItems: 'center',
                rowGap: 6,
            }}
        >
            <FilterGroup label="미션">
                <FilterChip
                    active={filters.s1a}
                    label="S1A"
                    n={facetCounts['mission:S1A'] ?? 0}
                    onClick={() => setFilters((f) => ({ ...f, s1a: !f.s1a }))}
                />
                <FilterChip
                    active={filters.s1c}
                    label="S1C"
                    n={facetCounts['mission:S1C'] ?? 0}
                    onClick={() => setFilters((f) => ({ ...f, s1c: !f.s1c }))}
                />
            </FilterGroup>
            <Sep />
            <FilterGroup label="제품">
                <FilterChip
                    active={filters.productMode === 'slc'}
                    label="SLC"
                    n={facetCounts['product:SLC'] ?? 0}
                    onClick={() => setFilters((f) => ({ ...f, productMode: 'slc' }))}
                />
                {(['grd', 'raw'] as const).map((k) => {
                    const upper = k.toUpperCase();
                    return (
                        <FilterChip
                            key={k}
                            active={filters.productMode === 'others' && filters[k]}
                            label={upper}
                            n={facetCounts[`product:${upper}`] ?? 0}
                            onClick={() =>
                                setFilters((f) =>
                                    f.productMode === 'others'
                                        ? { ...f, [k]: !f[k] }
                                        : {
                                              ...f,
                                              productMode: 'others',
                                              grd: false,
                                              raw: false,
                                              [k]: true,
                                          },
                                )
                            }
                        />
                    );
                })}
            </FilterGroup>
            <Sep />
            <FilterGroup label="편광">
                {S1_POLS.map((p) => (
                    <FilterChip
                        key={p}
                        active={filters.pol.includes(p)}
                        label={p}
                        n={facetCounts[`pol:${p}`] ?? 0}
                        onClick={() =>
                            setFilters((f) => ({
                                ...f,
                                pol: f.pol.includes(p) ? f.pol.filter((x) => x !== p) : [...f.pol, p],
                            }))
                        }
                    />
                ))}
            </FilterGroup>
        </div>
    );
}
