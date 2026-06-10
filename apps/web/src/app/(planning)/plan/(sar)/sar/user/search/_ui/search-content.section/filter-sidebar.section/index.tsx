'use client';

/** 좌측 필터 사이드바 — 플랫폼/AOI/날짜/플랫폼별 필터 + 하단 검색 컨트롤. */
import { DateRangePicker, Icon, InfoTip, useToast } from '@/_ui/hifi';

import { useSearchContext } from '../../../_context/SearchContext';
import { presetRange } from '../../../_constants/search-filters';
import { DATE_PRESETS, PLATFORMS } from '../../../_constants/search-platforms';
import { FilterDivider } from '../shared.widget';
import { S1FilterPanel } from './s1-filters.panel';
import { S2FilterPanel } from './s2-filters.panel';
import { NisarFilterPanel } from './nisar-filters.panel';
import { ComingSoonPanel } from './coming-soon.panel';

export function FilterSidebar() {
    const toast = useToast();
    const {
        platform,
        setPlatform,
        filters,
        setFilters,
        s2Filters,
        setS2Filters,
        aoi,
        aoiBounds,
        activeTool,
        aoiOpen,
        setAoiOpen,
        aoiTriggerRef,
        clearAoi,
        isSearching,
        runSearch,
        resetFilters,
    } = useSearchContext();

    return (
        <aside className="split__side split__side--left" style={{ width: 280 }}>
            <div className="col gap-4" style={{ padding: 16, overflow: 'auto', flex: 1, minHeight: 0 }}>
                <div>
                    <label className="field-label" style={{ marginBottom: 4 }}>
                        위성 플랫폼
                    </label>
                    <select
                        className="input"
                        aria-label="위성 플랫폼 선택"
                        style={{ width: '100%', height: 36, padding: '0 10px', fontSize: 13 }}
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value as typeof platform)}
                    >
                        {PLATFORMS.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                                {p.ready ? '' : ' · 준비중'}
                            </option>
                        ))}
                    </select>
                </div>

                <FilterDivider />

                <div>
                    <label className="field-label" style={{ marginBottom: 4 }}>
                        AOI (관심 영역)
                    </label>
                    <button
                        ref={aoiTriggerRef}
                        type="button"
                        onClick={() => setAoiOpen((v) => !v)}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'var(--bg-2)',
                            border: `1px solid ${aoiOpen ? 'var(--accent-border)' : 'var(--border-default)'}`,
                            borderRadius: 6,
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            color: 'var(--text-primary)',
                        }}
                    >
                        <Icon name="square" size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
                        <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                            {aoi && aoiBounds ? (
                                <>
                                    <span className="mono tabular" style={{ fontSize: 11 }}>
                                        NW {aoiBounds.nwLat.toFixed(3)}, {aoiBounds.nwLon.toFixed(3)}
                                    </span>
                                    <span className="mono tabular" style={{ fontSize: 11 }}>
                                        SE {aoiBounds.seLat.toFixed(3)}, {aoiBounds.seLon.toFixed(3)}
                                    </span>
                                </>
                            ) : (
                                <span className="faint" style={{ fontSize: 12 }}>
                                    클릭해서 AOI 설정
                                </span>
                            )}
                        </div>
                        <Icon
                            name="chevronDown"
                            size={12}
                            style={{
                                opacity: 0.6,
                                transition: 'transform 120ms',
                                transform: aoiOpen ? 'rotate(180deg)' : undefined,
                                flexShrink: 0,
                            }}
                        />
                    </button>
                    {aoi ? (
                        <div className="row gap-2" style={{ marginTop: 8 }}>
                            <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                style={{ flex: 1 }}
                                onClick={clearAoi}
                            >
                                AOI 해제
                            </button>
                        </div>
                    ) : activeTool !== 'bbox' ? (
                        <div className="faint" style={{ fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
                            검색하려면 지도 좌측 상단의 <b>사각형</b> 도구로 AOI를 그리거나 좌표를 입력하세요.
                        </div>
                    ) : null}
                </div>

                <FilterDivider />

                <div>
                    <label className="field-label">날짜 범위</label>
                    <div style={{ marginTop: 2 }}>
                        <DateRangePicker
                            start={filters.startDate}
                            end={filters.endDate}
                            maxDate={new Date()}
                            onChange={(s, e) =>
                                setFilters((f) => ({ ...f, startDate: s, endDate: e, datePreset: '' }))
                            }
                        />
                    </div>
                    <div className="row gap-1" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                        {DATE_PRESETS.map((t) => (
                            <span
                                key={t}
                                className={`chip${filters.datePreset === t ? ' chip--active' : ''}`}
                                style={{ height: 22, fontSize: 11 }}
                                onClick={() => {
                                    const [s, e] = presetRange(t);
                                    setFilters((f) => ({ ...f, startDate: s, endDate: e, datePreset: t }));
                                }}
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                </div>

                <FilterDivider />

                {platform === 'S1' ? (
                    <S1FilterPanel filters={filters} setFilters={setFilters} />
                ) : platform === 'S2' ? (
                    <S2FilterPanel filters={s2Filters} setFilters={setS2Filters} />
                ) : platform === 'nisar' ? (
                    <NisarFilterPanel filters={filters} setFilters={setFilters} />
                ) : (
                    <ComingSoonPanel platform={PLATFORMS.find((p) => p.value === platform)!} />
                )}
            </div>

            <div
                className="col gap-2"
                style={{
                    flex: '0 0 auto',
                    padding: 16,
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-1)',
                }}
            >
                <label className="row gap-2" style={{ cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={filters.haveOnly}
                        onChange={(e) => setFilters((f) => ({ ...f, haveOnly: e.target.checked }))}
                    />
                    <span style={{ fontSize: 12.5 }}>NAS 보유만 표시</span>
                    <InfoTip text="이미 NAS에 다운로드되어 즉시 사용 가능한 scene만 보여줍니다. 추가 다운로드 없이 바로 분석할 수 있습니다." />
                    <span className="badge badge--success" style={{ marginLeft: 'auto' }}>
                        빠름
                    </span>
                </label>
                <label className="row gap-2" style={{ cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={filters.esaRefresh}
                        onChange={(e) => setFilters((f) => ({ ...f, esaRefresh: e.target.checked }))}
                    />
                    <span style={{ fontSize: 12.5 }}>CDSE 카탈로그 강제 갱신</span>
                    <InfoTip text="로컬 캐시 대신 CDSE(Copernicus Data Space Ecosystem) 원본 카탈로그를 다시 조회합니다. 최신 scene을 보장하지만 검색이 느려질 수 있습니다." />
                </label>
                <div className="row gap-2" style={{ marginTop: 4 }}>
                    <button
                        type="button"
                        className="btn btn--primary"
                        style={{ flex: 1 }}
                        onClick={runSearch}
                        disabled={isSearching}
                    >
                        {isSearching ? (
                            <>
                                <span
                                    aria-hidden
                                    style={{
                                        display: 'inline-block',
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        border: '2px solid currentColor',
                                        borderTopColor: 'transparent',
                                        animation: 'spin 0.8s linear infinite',
                                        marginRight: 6,
                                        verticalAlign: '-2px',
                                    }}
                                />
                                검색 중…
                            </>
                        ) : activeTool === 'bbox' ? (
                            <>
                                <Icon name="square" size={13} /> AOI 그리는 중…
                            </>
                        ) : (
                            <>
                                <Icon name="search" size={13} /> 검색
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm"
                        data-tooltip="필터 초기화"
                        aria-label="필터 초기화"
                        onClick={resetFilters}
                    >
                        <Icon name="refresh" size={13} />
                    </button>
                    <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm"
                        data-tooltip="CDSE 카탈로그 동기화"
                        aria-label="CDSE 카탈로그 동기화"
                        onClick={() => toast('CDSE 카탈로그 동기화 중…', { tone: 'success' })}
                    >
                        <Icon name="satellite" size={13} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
