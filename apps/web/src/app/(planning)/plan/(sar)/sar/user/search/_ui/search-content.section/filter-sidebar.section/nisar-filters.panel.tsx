'use client';

/** NISAR(L/S-band SAR) 전용 필터 — 주파수 밴드, 제품 레벨, 편광 모드. */
import type { Dispatch, SetStateAction } from 'react';

import type { SearchUI } from '../../../_mocks/search.ui-interface';
import { NISAR_BANDS, NISAR_POLS } from '../../../_constants/search-platforms';
import { FilterDivider } from '../shared.widget';

export function NisarFilterPanel({
    filters,
    setFilters,
}: {
    filters: SearchUI.Filters;
    setFilters: Dispatch<SetStateAction<SearchUI.Filters>>;
}) {
    return (
        <>
            <div>
                <label className="field-label">주파수 밴드 (다중 선택)</label>
                <div className="col gap-2" style={{ marginTop: 4 }}>
                    {NISAR_BANDS.map((b) => {
                        const checked = filters.nisarBands.includes(b.key);
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
                                            nisarBands: checked
                                                ? f.nisarBands.filter((x) => x !== b.key)
                                                : [...f.nisarBands, b.key],
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

            <FilterDivider />

            <div>
                <label className="field-label">제품 레벨</label>
                <div className="segmented" style={{ marginTop: 2, display: 'flex', width: '100%' }}>
                    {(['RSLC', 'GSLC', 'GCOV'] as const).map((p) => (
                        <button
                            key={p}
                            type="button"
                            className={filters.nisarProduct === p ? 'active' : ''}
                            style={{ flex: 1 }}
                            onClick={() => setFilters((f) => ({ ...f, nisarProduct: p }))}
                        >
                            {p}
                        </button>
                    ))}
                </div>
                <div className="faint" style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.5 }}>
                    {filters.nisarProduct === 'RSLC'
                        ? 'Range-Doppler Single Look Complex — 위상 보존, InSAR/시계열 분석에 사용'
                        : filters.nisarProduct === 'GSLC'
                          ? 'Geocoded SLC — 지형 보정된 복소 영상'
                          : 'Geocoded Covariance — 편광 공분산 행렬 (편광 분석·분류)'}
                </div>
            </div>

            <FilterDivider />

            <div>
                <label className="field-label">편광 모드 (다중 선택)</label>
                <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                    {NISAR_POLS.map((p) => (
                        <span
                            key={p}
                            className={`chip${filters.nisarPol.includes(p) ? ' chip--active' : ''}`}
                            onClick={() =>
                                setFilters((f) => ({
                                    ...f,
                                    nisarPol: f.nisarPol.includes(p)
                                        ? f.nisarPol.filter((x) => x !== p)
                                        : [...f.nisarPol, p],
                                }))
                            }
                        >
                            {p}
                        </span>
                    ))}
                </div>
                <div className="faint" style={{ fontSize: 11, marginTop: 6, lineHeight: 1.45 }}>
                    single(HH/VV) · dual(HH+HV / VV+VH) · quad(HH+HV+VH+VV) · compact(RH+RV)
                </div>
            </div>
        </>
    );
}
