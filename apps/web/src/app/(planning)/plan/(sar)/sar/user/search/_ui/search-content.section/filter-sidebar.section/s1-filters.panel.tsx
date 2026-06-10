'use client';

/** Sentinel-1 전용 필터 — 미션 / 제품 타입 / 편광 / Pass 방향. */
import type { Dispatch, SetStateAction } from 'react';

import type { SearchUI } from '../../../_mocks/search.ui-interface';
import { S1_POLS } from '../../../_constants/search-platforms';
import { FilterDivider } from '../shared.widget';

export function S1FilterPanel({
    filters,
    setFilters,
}: {
    filters: SearchUI.Filters;
    setFilters: Dispatch<SetStateAction<SearchUI.Filters>>;
}) {
    return (
        <>
            <div>
                <label className="field-label">미션</label>
                <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                    <span
                        className={`chip${filters.s1a ? ' chip--active' : ''}`}
                        onClick={() => setFilters((f) => ({ ...f, s1a: !f.s1a }))}
                    >
                        Sentinel-1A
                    </span>
                    <span
                        className={`chip${filters.s1c ? ' chip--active' : ''}`}
                        onClick={() => setFilters((f) => ({ ...f, s1c: !f.s1c }))}
                    >
                        Sentinel-1C
                    </span>
                </div>
            </div>

            <FilterDivider />

            <div>
                <label className="field-label">제품 타입</label>
                <div className="segmented" style={{ marginTop: 2, display: 'flex', width: '100%' }}>
                    <button
                        type="button"
                        className={filters.productMode === 'slc' ? 'active' : ''}
                        style={{ flex: 1 }}
                        onClick={() => setFilters((f) => ({ ...f, productMode: 'slc' }))}
                    >
                        SLC
                    </button>
                    <button
                        type="button"
                        className={filters.productMode === 'others' ? 'active' : ''}
                        style={{ flex: 1 }}
                        onClick={() => setFilters((f) => ({ ...f, productMode: 'others' }))}
                    >
                        GRD / RAW
                    </button>
                </div>
                {filters.productMode === 'slc' ? (
                    <div className="faint" style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.5 }}>
                        Single Look Complex — 위상 정보 보존, InSAR/PSInSAR 분석에 사용
                    </div>
                ) : (
                    <div className="col gap-2" style={{ marginTop: 8 }}>
                        {(
                            [
                                ['grd', 'GRD', 'Ground Range Detected — 진폭 영상'],
                                ['raw', 'RAW', 'Raw — 원시 신호'],
                            ] as const
                        ).map(([k, label, desc]) => (
                            <label
                                key={k}
                                className="row gap-2"
                                style={{ cursor: 'pointer', alignItems: 'flex-start' }}
                            >
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    style={{ marginTop: 2, flexShrink: 0 }}
                                    checked={filters[k]}
                                    onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.checked }))}
                                />
                                <div className="col" style={{ gap: 1, minWidth: 0 }}>
                                    <span style={{ fontWeight: 500, fontSize: 12.5 }}>{label}</span>
                                    <span className="faint" style={{ fontSize: 10.5, lineHeight: 1.35 }}>
                                        {desc}
                                    </span>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            <FilterDivider />

            <div>
                <label className="field-label">편광 (다중 선택)</label>
                <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                    {S1_POLS.map((p) => (
                        <span
                            key={p}
                            className={`chip${filters.pol.includes(p) ? ' chip--active' : ''}`}
                            onClick={() =>
                                setFilters((f) => ({
                                    ...f,
                                    pol: f.pol.includes(p) ? f.pol.filter((x) => x !== p) : [...f.pol, p],
                                }))
                            }
                        >
                            {p}
                        </span>
                    ))}
                </div>
            </div>

            <FilterDivider />

            <div>
                <label className="field-label">Pass 방향 (다중 선택)</label>
                <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                    <span
                        className={`chip${filters.passA ? ' chip--active' : ''}`}
                        onClick={() => setFilters((f) => ({ ...f, passA: !f.passA }))}
                    >
                        Ascending
                    </span>
                    <span
                        className={`chip${filters.passD ? ' chip--active' : ''}`}
                        onClick={() => setFilters((f) => ({ ...f, passD: !f.passD }))}
                    >
                        Descending
                    </span>
                </div>
            </div>
        </>
    );
}
