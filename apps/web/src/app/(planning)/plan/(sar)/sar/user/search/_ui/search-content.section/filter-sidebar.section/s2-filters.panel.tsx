'use client';

/** Sentinel-2(광학) 전용 필터 — 처리 레벨, 구름 비율, 밴드 선택. */
import type { Dispatch, SetStateAction } from 'react';

import type { SearchUI } from '../../../_mocks/search.ui-interface';
import { S2_BANDS, S2_CLOUD_PRESETS } from '../../../_constants/search-platforms';
import { FilterDivider } from '../shared.widget';

export function S2FilterPanel({
    filters,
    setFilters,
}: {
    filters: SearchUI.S2Filters;
    setFilters: Dispatch<SetStateAction<SearchUI.S2Filters>>;
}) {
    return (
        <>
            <div>
                <label className="field-label">처리 레벨</label>
                <div className="segmented" style={{ marginTop: 2, display: 'flex', width: '100%' }}>
                    {(['L1C', 'L2A'] as const).map((lv) => (
                        <button
                            key={lv}
                            type="button"
                            className={filters.level === lv ? 'active' : ''}
                            style={{ flex: 1 }}
                            onClick={() => setFilters((f) => ({ ...f, level: lv }))}
                        >
                            {lv}
                        </button>
                    ))}
                </div>
                <div className="faint" style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.5 }}>
                    {filters.level === 'L1C'
                        ? 'Top-of-Atmosphere 반사율 (대기 보정 전)'
                        : 'Bottom-of-Atmosphere 반사율 + SCL 클래스맵 (Sen2Cor 처리)'}
                </div>
            </div>

            <FilterDivider />

            <div>
                <div className="between" style={{ alignItems: 'baseline' }}>
                    <label className="field-label" style={{ margin: 0 }}>
                        최대 구름 비율
                    </label>
                    <span className="mono tabular" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        ≤ {filters.cloudMax}%
                    </span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={filters.cloudMax}
                    onChange={(e) => setFilters((f) => ({ ...f, cloudMax: Number(e.target.value) }))}
                    style={{ width: '100%', marginTop: 6 }}
                    aria-label="최대 구름 비율"
                />
                <div className="row gap-1" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                    {S2_CLOUD_PRESETS.map((v) => (
                        <span
                            key={v}
                            className={`chip${filters.cloudMax === v ? ' chip--active' : ''}`}
                            style={{ height: 22, fontSize: 11 }}
                            onClick={() => setFilters((f) => ({ ...f, cloudMax: v }))}
                        >
                            {v}%
                        </span>
                    ))}
                </div>
            </div>

            <FilterDivider />

            <div>
                <label className="field-label">밴드 (다중 선택)</label>
                <div className="col gap-2" style={{ marginTop: 4 }}>
                    {S2_BANDS.map((b) => {
                        const checked = filters.bands.includes(b.key);
                        return (
                            <label
                                key={b.key}
                                className="row gap-2"
                                style={{ cursor: 'pointer', alignItems: 'flex-start' }}
                            >
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    style={{ marginTop: 2, flexShrink: 0 }}
                                    checked={checked}
                                    onChange={() =>
                                        setFilters((f) => ({
                                            ...f,
                                            bands: checked
                                                ? f.bands.filter((x) => x !== b.key)
                                                : [...f.bands, b.key],
                                        }))
                                    }
                                />
                                <div className="col" style={{ gap: 1, minWidth: 0 }}>
                                    <span style={{ fontWeight: 500, fontSize: 12.5 }}>{b.label}</span>
                                    <span className="faint" style={{ fontSize: 10.5, lineHeight: 1.35 }}>
                                        {b.desc}
                                    </span>
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
