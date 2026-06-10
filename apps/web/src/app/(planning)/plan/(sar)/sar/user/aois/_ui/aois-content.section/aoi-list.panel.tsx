'use client';

import { useAoisContext } from '../../_context/AoisContext';
import { AoiThumbnail } from '../../../../_components/AoiThumbnail';

export function AoiListPanel() {
    const { aois, filtered, q, setQ, selected, focusAoi, goApply, openEditing, AOI를_삭제한다 } =
        useAoisContext();

    return (
        <aside className="split__side split__side--left" style={{ width: 400 }}>
            <div
                className="col gap-2"
                style={{ padding: 12, borderBottom: '1px solid var(--border-subtle)' }}
            >
                <div className="between">
                    <div className="card__title">AOI 목록</div>
                    <span className="badge badge--neutral">
                        {filtered.length} / {aois.length}
                    </span>
                </div>
                <input
                    className="input input--search"
                    placeholder="AOI 이름·설명 검색…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
                {filtered.length === 0 ? (
                    <div className="empty" style={{ padding: 40 }}>
                        <div className="empty__icon">📌</div>
                        <div style={{ fontSize: 13 }}>
                            {aois.length === 0 ? '저장된 AOI 가 없습니다' : '일치하는 AOI 가 없습니다'}
                        </div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                            오른쪽 지도에서 <b>사각형</b> 도구로
                            <br />
                            영역을 그려 새 AOI 를 등록하세요.
                        </div>
                    </div>
                ) : null}
                {filtered.map((a) => (
                    <div
                        key={a.id}
                        className="col gap-2"
                        style={{
                            padding: '12px 14px',
                            borderBottom: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            background: selected === a.id ? 'var(--accent-soft)' : undefined,
                        }}
                        onClick={() => focusAoi(a)}
                    >
                        <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                            <AoiThumbnail
                                nwLat={a.nwLat}
                                nwLon={a.nwLon}
                                seLat={a.seLat}
                                seLon={a.seLon}
                                width={64}
                                height={64}
                            />
                            <div className="col gap-1" style={{ flex: 1, minWidth: 0 }}>
                                <div className="between">
                                    <span
                                        style={{
                                            fontWeight: 600,
                                            color: selected === a.id ? 'var(--accent)' : undefined,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {a.name}
                                    </span>
                                    <span
                                        className="faint mono tabular"
                                        style={{ fontSize: 11, flexShrink: 0 }}
                                    >
                                        {a.createdAt.slice(0, 10)}
                                    </span>
                                </div>
                                <div
                                    className="muted"
                                    style={{
                                        fontSize: 12,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        opacity: a.description ? 1 : 0.5,
                                    }}
                                >
                                    {a.description ?? '설명 없음'}
                                </div>
                                <div className="mono tabular faint" style={{ fontSize: 11 }}>
                                    NW {a.nwLat.toFixed(3)}, {a.nwLon.toFixed(3)} · SE {a.seLat.toFixed(3)},{' '}
                                    {a.seLon.toFixed(3)}
                                </div>
                            </div>
                        </div>
                        <div
                            className="row between"
                            style={{ flexWrap: 'wrap', gap: 6 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="row gap-1">
                                <button
                                    type="button"
                                    className="btn btn--ghost btn--sm"
                                    onClick={() => openEditing(a)}
                                >
                                    이름 수정
                                </button>
                                <button
                                    type="button"
                                    className="btn btn--ghost btn--sm"
                                    onClick={() => AOI를_삭제한다(a)}
                                >
                                    삭제
                                </button>
                            </div>
                            <div className="row gap-1">
                                <button
                                    type="button"
                                    className="btn btn--sm"
                                    data-tooltip="InSAR 분석에 적용"
                                    onClick={() => goApply(a, 'insar')}
                                >
                                    분석
                                </button>
                                <button
                                    type="button"
                                    className="btn btn--outline-accent btn--sm"
                                    data-tooltip="검색에 적용"
                                    onClick={() => goApply(a, 'search')}
                                >
                                    검색
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}
