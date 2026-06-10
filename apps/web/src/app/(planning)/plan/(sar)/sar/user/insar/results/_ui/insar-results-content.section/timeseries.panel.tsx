'use client';

import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/_ui/hifi';
import { useInsarResultsContext } from '../../_context/InsarResultsContext';
import { TimeseriesChart } from './timeseries-chart.widget';

/** 하단 시계열 패널 — 선택된 점 목록 + LOS 변위 차트(접기/펼치기). */
export function TimeseriesPanel() {
    const { points, current, clearPoints, removePoint, 시계열을_CSV로_내보낸다 } =
        useInsarResultsContext();

    const [open, setOpen] = useState(true);
    // 점이 추가되면 자동으로 펼친다 — 지도를 클릭한 의도가 시계열 확인이므로.
    const prevCountRef = useRef(points.length);
    useEffect(() => {
        if (points.length > prevCountRef.current) setOpen(true);
        prevCountRef.current = points.length;
    }, [points.length]);

    const onExport = () => 시계열을_CSV로_내보낸다(points, current?.id ?? 'product');

    return (
        <div
            style={{
                flexShrink: 0,
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-2)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                zIndex: 9,
            }}
        >
            <div
                className="results-header between"
                role="button"
                aria-expanded={open}
                aria-label={open ? 'LOS 변위 시계열 접기' : 'LOS 변위 시계열 펼치기'}
                tabIndex={0}
                data-open={open}
                onClick={() => setOpen((v) => !v)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpen((v) => !v);
                    }
                }}
            >
                <div className="row gap-3" style={{ alignItems: 'center', minWidth: 0 }}>
                    <Icon
                        name="chevronDown"
                        size={13}
                        style={{
                            transition: 'transform 200ms ease',
                            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                            opacity: 0.75,
                        }}
                    />
                    <div className="row gap-2">
                        <Icon name="chart" size={14} />
                        <span style={{ fontWeight: 600 }}>LOS 변위 시계열</span>
                    </div>
                    <div className="row gap-1">
                        {points.map((p) => (
                            <span
                                key={p.id}
                                className="badge"
                                style={{
                                    background: p.color + '22',
                                    color: p.color,
                                    border: `1px solid ${p.color}44`,
                                }}
                            >
                                ● {p.id}
                            </span>
                        ))}
                    </div>
                </div>
                {open ? (
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onExport();
                        }}
                    >
                        <Icon name="download" size={11} /> CSV 내보내기
                    </button>
                ) : null}
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateRows: open ? '1fr' : '0fr',
                    transition: 'grid-template-rows 260ms ease',
                }}
                aria-hidden={!open}
            >
                <div style={{ minHeight: 0, overflow: 'hidden' }}>
                    <div style={{ height: 220, display: 'flex', minHeight: 0 }}>
                        {/* 선택된 점 — 시계열과 한 패널에서 관리 (점 ↔ 라인 매핑이 한눈에). */}
                        <div
                            className="col"
                            style={{
                                width: 216,
                                flexShrink: 0,
                                borderRight: '1px solid var(--border-subtle)',
                                padding: '10px 12px',
                                gap: 8,
                                overflow: 'auto',
                            }}
                        >
                            <div className="between" style={{ alignItems: 'center' }}>
                                <span className="faint" style={{ fontSize: 11 }}>
                                    선택된 점 ({points.length}/8)
                                </span>
                                {points.length > 0 ? (
                                    <button
                                        type="button"
                                        className="btn btn--ghost btn--sm"
                                        onClick={clearPoints}
                                    >
                                        전체 해제
                                    </button>
                                ) : null}
                            </div>
                            {points.length === 0 ? (
                                <div className="faint" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                                    지도를 클릭해 시계열 점을 추가하세요 (최대 8개)
                                </div>
                            ) : (
                                <div className="col gap-2">
                                    {points.map((p) => (
                                        <div
                                            key={p.id}
                                            className="row gap-2"
                                            style={{
                                                padding: '5px 7px',
                                                borderRadius: 4,
                                                background: 'var(--bg-3)',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 13,
                                                    height: 13,
                                                    borderRadius: 50,
                                                    background: p.color,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {p.id}
                                            </span>
                                            <span
                                                className="mono tabular faint"
                                                style={{ fontSize: 11, flex: 1 }}
                                            >
                                                {p.lon.toFixed(3)}E, {p.lat.toFixed(3)}N
                                            </span>
                                            <Icon
                                                name="x"
                                                size={11}
                                                style={{
                                                    color: 'var(--text-tertiary)',
                                                    cursor: 'pointer',
                                                }}
                                                onClick={() => removePoint(p.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '12px 16px', flex: 1, minWidth: 0 }}>
                            {points.length === 0 ? (
                                <div className="empty" style={{ padding: 20, fontSize: 12 }}>
                                    지도에서 점을 찍으면 시계열이 여기 표시됩니다
                                </div>
                            ) : (
                                <TimeseriesChart points={points} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
