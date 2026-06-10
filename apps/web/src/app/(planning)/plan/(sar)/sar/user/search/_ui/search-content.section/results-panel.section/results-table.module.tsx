'use client';

/** 결과 목록 테이블 — scene 행 + 빈 상태 + 하단 통계/페이지네이션. */
import { Icon, Quicklook } from '@/_ui/hifi';

import { useSearchContext } from '../../../_context/SearchContext';
import { PAGE_SIZE_OPTIONS, relativeOrbit } from '../../../_constants/search-filters';
import { PLATFORMS } from '../../../_constants/search-platforms';
import { CompactStat, Sep } from '../shared.widget';

export function ResultsTable() {
    const {
        scenes,
        platform,
        paginated,
        allChecked,
        toggleAll,
        toggleOne,
        checked,
        selectedSceneId,
        openSceneModal,
        inCart,
        씬을_담는다,
        resetFilters,
        stats,
        safePage,
        totalPages,
        pageSize,
        setPageSize,
        setPage,
        pageRange,
    } = useSearchContext();

    return (
        <div
            className="card"
            style={{ maxHeight: 320, overflow: 'auto', display: 'flex', flexDirection: 'column' }}
        >
            {scenes.length === 0 ? (
                <div className="empty" style={{ padding: 60 }}>
                    <div className="empty__icon">🔍</div>
                    {platform === 'S1' || platform === 'nisar' ? (
                        <>
                            <div>일치하는 scene이 없습니다</div>
                            <button
                                type="button"
                                className="btn btn--sm"
                                style={{ marginTop: 12 }}
                                onClick={resetFilters}
                            >
                                필터 초기화
                            </button>
                        </>
                    ) : platform === 'S2' ? (
                        <>
                            <div>Sentinel-2 카탈로그 연동 준비 중</div>
                            <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
                                필터 UI 만 미리보기 — 실제 검색 결과는 아직 표시되지 않습니다.
                            </div>
                        </>
                    ) : (
                        <>
                            <div>{PLATFORMS.find((p) => p.value === platform)?.label} — 연동 준비 중</div>
                            <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
                                Sentinel-1 을 선택하면 검색 결과를 볼 수 있습니다.
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <table className="table">
                    <thead>
                        <tr>
                            <th className="checkbox-col">
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={allChecked}
                                    onChange={toggleAll}
                                />
                            </th>
                            <th>Scene</th>
                            <th>미션</th>
                            <th className="num">Track</th>
                            <th className="num">Orbit</th>
                            <th>제품</th>
                            <th>편광</th>
                            <th>취득 시각</th>
                            <th className="num">용량</th>
                            <th>상태</th>
                            <th style={{ width: 80 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((s) => (
                            <tr
                                key={s.id}
                                className={selectedSceneId === s.id ? 'is-selected' : ''}
                                onClick={() => openSceneModal(s)}
                            >
                                <td className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={checked.has(s.id)}
                                        onChange={() => toggleOne(s.id)}
                                    />
                                </td>
                                <td>
                                    <div className="row gap-3">
                                        <Quicklook sceneId={s.id} size={42} product={s.product} />
                                        <div className="mono" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
                                            {s.id}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className="badge badge--solid" style={{ fontSize: 10 }}>
                                        {s.mission}
                                    </span>
                                </td>
                                <td className="num mono tabular" style={{ fontSize: 12 }}>
                                    {relativeOrbit(s.orbit, s.mission) ?? '—'}
                                </td>
                                <td className="num mono tabular" style={{ fontSize: 12 }}>
                                    {s.orbit ?? '—'}
                                </td>
                                <td>
                                    <span className="badge badge--neutral">{s.product}</span>
                                </td>
                                <td className="mono" style={{ fontSize: 12 }}>
                                    {s.pol}
                                </td>
                                <td
                                    className="mono tabular"
                                    style={{ fontSize: 12, color: 'var(--text-secondary)' }}
                                >
                                    {s.date}
                                </td>
                                <td className="num tabular mono" style={{ fontSize: 12 }}>
                                    {s.size}
                                </td>
                                <td>
                                    {s.have ? (
                                        <span className="status status--done">NAS 보유</span>
                                    ) : (
                                        <span className="status status--pending">받기 필요</span>
                                    )}
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                    <div className="row gap-1">
                                        {inCart(s.id) ? (
                                            <button type="button" className="btn btn--sm" disabled>
                                                <Icon name="check" size={12} /> 담김
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn btn--outline-accent btn--sm"
                                                onClick={() => 씬을_담는다(s)}
                                            >
                                                담기
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <div
                className="row"
                style={{
                    padding: '8px 14px',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: 12,
                    color: 'var(--text-tertiary)',
                    gap: 14,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                {/* 좌하단 — 결과 통계. */}
                {scenes.length > 0 ? (
                    <div className="row" style={{ gap: 14, flexWrap: 'wrap', alignItems: 'baseline' }}>
                        <CompactStat
                            label="결과"
                            value={`${stats.total}`}
                            sub={`${stats.totalGb.toFixed(1)} GB`}
                        />
                        <Sep />
                        <CompactStat label="결과 기간" value={stats.resultRange} mono />
                        <Sep />
                        <CompactStat
                            label="NAS 보유"
                            value={`${stats.haveCount}`}
                            sub={`${stats.havePct}%`}
                            tone="success"
                        />
                        <Sep />
                        <CompactStat
                            label="받기 필요"
                            value={`${stats.needCount}`}
                            sub={`${stats.needPct}%`}
                            tone="warning"
                        />
                    </div>
                ) : (
                    <span />
                )}
                {/* 우하단 — 범위 표시 + 페이지네이션. */}
                <div className="row" style={{ gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="tabular" style={{ whiteSpace: 'nowrap' }}>
                        {scenes.length === 0
                            ? '0'
                            : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, scenes.length)}`}{' '}
                        / {scenes.length}
                    </span>
                    <div className="row gap-1" style={{ alignItems: 'center' }}>
                        <button
                            type="button"
                            className="btn btn--ghost btn--icon btn--sm"
                            aria-label="이전 페이지"
                            disabled={safePage <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            <Icon name="chevronRight" size={13} style={{ transform: 'scaleX(-1)' }} />
                        </button>
                        {pageRange.map((p, i) =>
                            p === '...' ? (
                                <span key={`gap-${i}`} className="faint mono" style={{ padding: '0 4px' }}>
                                    …
                                </span>
                            ) : (
                                <button
                                    key={p}
                                    type="button"
                                    className={`btn btn--sm${p === safePage ? ' btn--primary' : ' btn--ghost'}`}
                                    style={{ minWidth: 28, padding: '0 8px' }}
                                    aria-current={p === safePage ? 'page' : undefined}
                                    onClick={() => setPage(p)}
                                >
                                    {p}
                                </button>
                            ),
                        )}
                        <button
                            type="button"
                            className="btn btn--ghost btn--icon btn--sm"
                            aria-label="다음 페이지"
                            disabled={safePage >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                            <Icon name="chevronRight" size={13} />
                        </button>
                    </div>
                    <label
                        className="row gap-2"
                        style={{ alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                        <span className="faint">페이지당</span>
                        <select
                            className="input"
                            style={{ height: 26, padding: '0 6px', fontSize: 12, width: 'auto' }}
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            aria-label="페이지당 행 수"
                        >
                            {PAGE_SIZE_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>
        </div>
    );
}
