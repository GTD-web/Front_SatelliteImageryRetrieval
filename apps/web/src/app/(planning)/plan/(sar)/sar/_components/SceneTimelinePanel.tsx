'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Icon } from '@/_ui/hifi';

// ────────────────────────────────────────────────────────────────────────────
// 분석 요청 — 하단 scene 타임라인 (헤더 + 접기/펼치기 + edsc 스타일 graph)
// 검색 페이지의 "타임라인" 탭에서도 동일하게 재사용한다.
// ────────────────────────────────────────────────────────────────────────────

interface RequestTimelinePanelProps {
    rangeStart: Date;
    rangeEnd: Date;
    onRangeChange: (start: Date, end: Date) => void;
    /** 패널 헤더 자체를 노출할지. 검색 탭 안에서는 헤더 없이 graph 만 쓰기 위해 false 로 둘 수 있음. */
    showHeader?: boolean;
    /** 초기 collapsed 상태. showHeader=false 인 경우엔 무시된다. */
    defaultCollapsed?: boolean;
}

export function RequestTimelinePanel({
    rangeStart,
    rangeEnd,
    onRangeChange,
    showHeader = true,
    defaultCollapsed = false,
}: RequestTimelinePanelProps) {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const expanded = showHeader ? !collapsed : true;

    return (
        <>
            {showHeader ? (
                <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={!collapsed}
                    aria-label={collapsed ? '타임라인 펼치기' : '타임라인 접기'}
                    onClick={() => setCollapsed((c) => !c)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setCollapsed((c) => !c);
                        }
                    }}
                    className="between"
                    style={{
                        padding: '10px 16px',
                        borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)',
                        flexShrink: 0,
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'border-bottom-color 220ms ease',
                    }}
                >
                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <Icon
                            name="chevronDown"
                            size={13}
                            style={{
                                transition: 'transform 220ms ease',
                                transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                opacity: 0.85,
                            }}
                        />
                        <Icon name="chart" size={14} />
                        <span style={{ fontWeight: 600 }}>타임라인</span>
                    </div>
                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                        {!collapsed ? (
                            <span className="faint" style={{ fontSize: 10.5 }}>
                                휠로 줌 · Shift+휠로 이동 · 드래그로 이동
                            </span>
                        ) : (
                            <span className="faint" style={{ fontSize: 10.5 }}>
                                클릭해서 펼치기
                            </span>
                        )}
                    </div>
                </div>
            ) : null}

            <div
                style={{
                    display: 'grid',
                    gridTemplateRows: expanded ? '1fr' : '0fr',
                    transition: 'grid-template-rows 220ms ease',
                }}
                aria-hidden={!expanded}
            >
                <div style={{ minHeight: 0, overflow: 'hidden' }}>
                    <SceneTimelineGraph
                        rangeStart={rangeStart}
                        rangeEnd={rangeEnd}
                        onRangeChange={onRangeChange}
                    />
                </div>
            </div>
        </>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// edsc/timeline 스타일 — 두 줄 시간축 (year/month band) + 기간 핸들.
// 드래그로 pan, 휠로 zoom. NASA Earthdata Search 의 timeline 과 유사.
// scene 마커/lane 은 의도적으로 숨김 — scene 은 우측 패널에서만 표시한다.
// ────────────────────────────────────────────────────────────────────────────

const MONTH_ABBR_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

/** 줌 단계별 화면에 보이는 시간 범위(일). 1=가장 넓음(10년), 5=가장 좁음(1개월). */
const ZOOM_DAYS: Record<number, number> = {
    1: 365 * 10,
    2: 365 * 3,
    3: 365,
    4: 90,
    5: 30,
};

interface SceneTimelineGraphProps {
    /** 현재 사이드바의 기간 — 핸들 표시 + drag 시 이 값을 갱신. */
    rangeStart: Date;
    rangeEnd: Date;
    onRangeChange: (start: Date, end: Date) => void;
}

export function SceneTimelineGraph({
    rangeStart,
    rangeEnd,
    onRangeChange,
}: SceneTimelineGraphProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [containerW, setContainerW] = useState(900);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        setContainerW(el.clientWidth);
        const ro = new ResizeObserver((entries) => {
            const e = entries[0];
            if (e) setContainerW(e.contentRect.width);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const day = 24 * 60 * 60 * 1000;

    // 사이드바 기간 기반 초기 zoom 단계
    const rangeStartMs = rangeStart.getTime();
    const rangeEndMs = rangeEnd.getTime();
    const initialZoom = useMemo(() => {
        const targetSpan = Math.max(rangeEndMs - rangeStartMs, day) * 1.5;
        if (targetSpan <= 30 * day) return 5;
        if (targetSpan <= 90 * day) return 4;
        if (targetSpan <= 365 * day) return 3;
        if (targetSpan <= 365 * 3 * day) return 2;
        return 1;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rangeStartMs, rangeEndMs]);

    const [zoom, setZoom] = useState(initialZoom);
    const [centerMs, setCenterMs] = useState((rangeStartMs + rangeEndMs) / 2);

    // 컴포넌트가 처음 마운트될 때 1회만 fit. 이후엔 사용자의 pan/zoom 결과를 보존.
    const didFitRef = useRef(false);
    useEffect(() => {
        if (didFitRef.current) return;
        setCenterMs((rangeStartMs + rangeEndMs) / 2);
        setZoom(initialZoom);
        didFitRef.current = true;
    }, [rangeStartMs, rangeEndMs, initialZoom]);

    const spanMs = ZOOM_DAYS[zoom]! * day;
    const startMs = centerMs - spanMs / 2;
    const endMs = centerMs + spanMs / 2;

    // 레이아웃 — 미션 lane 없이 단일 트랙
    const PAD_LEFT = 16;
    const PAD_RIGHT = 16;
    const YEAR_H = 22;
    const MONTH_H = 18;
    const HEADER_H = YEAR_H + MONTH_H;
    const TRACK_H = 36;
    const lanesH = TRACK_H;
    const totalH = HEADER_H + TRACK_H;
    const innerW = Math.max(containerW - PAD_LEFT - PAD_RIGHT, 200);

    const xFor = (t: number) => PAD_LEFT + ((t - startMs) / spanMs) * innerW;

    // 연(年) cell — 화면에 걸친 year 들 전체
    const yearCells = useMemo(() => {
        const out: { year: number; x1: number; x2: number }[] = [];
        const startYear = new Date(startMs).getFullYear();
        const endYear = new Date(endMs).getFullYear();
        for (let y = startYear; y <= endYear; y++) {
            const yStart = new Date(y, 0, 1).getTime();
            const yEnd = new Date(y + 1, 0, 1).getTime();
            out.push({ year: y, x1: xFor(yStart), x2: xFor(yEnd) });
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startMs, endMs, innerW]);

    // 월 cell — zoom 3 이상에서만 의미 있음. 그 이하는 비워둔다.
    const monthCells = useMemo(() => {
        if (zoom < 3) return [];
        const out: { x1: number; x2: number; month: number; year: number }[] = [];
        const cursor = new Date(startMs);
        cursor.setDate(1);
        cursor.setHours(0, 0, 0, 0);
        cursor.setMonth(cursor.getMonth() - 1); // safety pad
        const last = new Date(endMs);
        last.setMonth(last.getMonth() + 1);
        while (cursor.getTime() <= last.getTime()) {
            const mStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getTime();
            const mEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1).getTime();
            out.push({
                x1: xFor(mStart),
                x2: xFor(mEnd),
                month: cursor.getMonth(),
                year: cursor.getFullYear(),
            });
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startMs, endMs, innerW, zoom]);

    // 드래그 pan / range 핸들 drag
    const dragRef = useRef<{ x: number; center: number } | null>(null);
    const draggedRef = useRef(false);
    const [grabbing, setGrabbing] = useState(false);
    const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);

    /** 화면 X 좌표 → timestamp 로 환산. SVG 의 boundingRect 필요. */
    const xToTime = (clientX: number, svgEl: SVGSVGElement): number => {
        const rect = svgEl.getBoundingClientRect();
        const x = clientX - rect.left;
        return startMs + ((x - PAD_LEFT) / innerW) * spanMs;
    };

    const onMouseDown = (e: React.MouseEvent) => {
        if (draggingHandle) return;
        dragRef.current = { x: e.clientX, center: centerMs };
        draggedRef.current = false;
        setGrabbing(true);
    };
    const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        // range 핸들 drag 가 활성이면 그쪽이 우선.
        if (draggingHandle) {
            const t = xToTime(e.clientX, e.currentTarget);
            const minSpan = 6 * day;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayMs = today.getTime();
            if (draggingHandle === 'start') {
                const maxStart = rangeEnd.getTime() - minSpan;
                const snapped = startOfDay(Math.min(t, maxStart));
                if (snapped !== rangeStart.getTime()) {
                    onRangeChange(new Date(snapped), rangeEnd);
                }
            } else {
                const minEnd = rangeStart.getTime() + minSpan;
                const clampedToToday = Math.min(t, todayMs);
                const snapped = startOfDay(Math.max(clampedToToday, minEnd));
                if (snapped !== rangeEnd.getTime()) {
                    onRangeChange(rangeStart, new Date(snapped));
                }
            }
            return;
        }
        const d = dragRef.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        if (Math.abs(dx) > 3) draggedRef.current = true;
        const msPerPx = spanMs / innerW;
        setCenterMs(d.center - dx * msPerPx);
    };
    const endDrag = () => {
        if (draggingHandle) setDraggingHandle(null);
        dragRef.current = null;
        setGrabbing(false);
        // 다음 click 까지 draggedRef 유지 → 0ms 후 리셋
        window.setTimeout(() => {
            draggedRef.current = false;
        }, 0);
    };

    const onHandleMouseDown = (which: 'start' | 'end') =>
        (e: React.MouseEvent) => {
            e.stopPropagation();
            setDraggingHandle(which);
            draggedRef.current = true; // 이 직후 click 으로 scene 토글되는 것을 막기 위함
        };

    // React 의 onWheel 은 passive 라 preventDefault 가 무시되므로 네이티브 리스너로 부착해
    // 페이지 스크롤이 새지 않게 한다. Shift + 휠 → 가로 pan, 그 외엔 줌 (deltaY 기준).
    useEffect(() => {
        const el = svgRef.current;
        if (!el) return;
        const onNativeWheel = (e: WheelEvent) => {
            if (e.shiftKey) {
                const dx = e.deltaX !== 0 ? e.deltaX : e.deltaY;
                if (dx === 0) return;
                e.preventDefault();
                const msPerPx = spanMs / innerW;
                setCenterMs((c) => c + dx * msPerPx);
            } else {
                if (e.deltaY === 0) return;
                e.preventDefault();
                setZoom((z) => Math.min(5, Math.max(1, z + (e.deltaY < 0 ? 1 : -1))));
            }
        };
        el.addEventListener('wheel', onNativeWheel, { passive: false });
        return () => el.removeEventListener('wheel', onNativeWheel);
    }, [spanMs, innerW]);

    return (
        <div
            ref={containerRef}
            style={{
                // height 를 콘텐츠(SVG 의 totalH)에 정확히 맞춰서 트랙 높이만큼만 패널이 차지하도록.
                height: totalH,
                flexShrink: 0,
                position: 'relative',
                background: 'var(--bg-2)',
                overflow: 'hidden',
            }}
        >
            <svg
                ref={svgRef}
                width={containerW}
                height={totalH}
                style={{
                    display: 'block',
                    cursor: grabbing ? 'grabbing' : 'grab',
                    userSelect: 'none',
                }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
            >
                <defs>
                    <clipPath id="edsc-track-clip">
                        <rect x={PAD_LEFT} y={0} width={innerW} height={totalH} />
                    </clipPath>
                </defs>

                {/* 좌측 라벨 거터 */}
                <rect x={0} y={0} width={PAD_LEFT} height={totalH} fill="var(--bg-1)" />

                {/* 클립된 메인 트랙 */}
                <g clipPath="url(#edsc-track-clip)">
                    {/* 연(year) band */}
                    {yearCells.map((c) => {
                        const cw = c.x2 - c.x1;
                        const cx = (Math.max(c.x1, PAD_LEFT) + Math.min(c.x2, PAD_LEFT + innerW)) / 2;
                        return (
                            <g key={`y-${c.year}`}>
                                <rect
                                    x={c.x1}
                                    y={0}
                                    width={cw}
                                    height={YEAR_H}
                                    fill={c.year % 2 === 0 ? 'var(--bg-3)' : 'var(--bg-1)'}
                                    stroke="var(--border-default)"
                                    strokeWidth={0.5}
                                />
                                {cw >= 36 ? (
                                    <text
                                        x={cx}
                                        y={YEAR_H / 2 + 4}
                                        fontSize={11}
                                        fontWeight={700}
                                        fill="var(--text-secondary)"
                                        textAnchor="middle"
                                        fontFamily="var(--font-mono)"
                                    >
                                        {c.year}
                                    </text>
                                ) : null}
                            </g>
                        );
                    })}

                    {/* 월(month) band */}
                    {monthCells.map((c, i) => {
                        const cw = c.x2 - c.x1;
                        const cx = (c.x1 + c.x2) / 2;
                        return (
                            <g key={`m-${i}`}>
                                <rect
                                    x={c.x1}
                                    y={YEAR_H}
                                    width={cw}
                                    height={MONTH_H}
                                    fill="var(--bg-2)"
                                    stroke="var(--border-subtle)"
                                    strokeWidth={0.5}
                                />
                                {cw >= 28 ? (
                                    <text
                                        x={cx}
                                        y={YEAR_H + MONTH_H / 2 + 3.5}
                                        fontSize={9.5}
                                        fill="var(--text-tertiary)"
                                        textAnchor="middle"
                                        fontFamily="var(--font-mono)"
                                    >
                                        {MONTH_ABBR_KO[c.month]}
                                    </text>
                                ) : cw >= 14 ? (
                                    <text
                                        x={cx}
                                        y={YEAR_H + MONTH_H / 2 + 3.5}
                                        fontSize={9}
                                        fill="var(--text-tertiary)"
                                        textAnchor="middle"
                                        fontFamily="var(--font-mono)"
                                    >
                                        {c.month + 1}
                                    </text>
                                ) : null}
                            </g>
                        );
                    })}

                    {/* 트랙 배경 (단일) */}
                    <rect
                        x={PAD_LEFT}
                        y={HEADER_H}
                        width={innerW}
                        height={TRACK_H}
                        fill="var(--bg-2)"
                    />

                    {/* 월 vertical gridline (트랙 안쪽으로 연장) */}
                    {monthCells.map((c, i) => (
                        <line
                            key={`g-m-${i}`}
                            x1={c.x1}
                            x2={c.x1}
                            y1={HEADER_H}
                            y2={totalH}
                            stroke="var(--border-subtle)"
                            strokeWidth={0.5}
                        />
                    ))}

                    {/* 연 vertical gridline 강조 */}
                    {yearCells.map((c) => (
                        <line
                            key={`g-y-${c.year}`}
                            x1={c.x1}
                            x2={c.x1}
                            y1={HEADER_H}
                            y2={totalH}
                            stroke="var(--border-default)"
                            strokeWidth={1}
                        />
                    ))}

                    {/* 오늘 marker */}
                    {(() => {
                        const now = Date.now();
                        if (now < startMs || now > endMs) return null;
                        const x = xFor(now);
                        return (
                            <g>
                                <line
                                    x1={x}
                                    x2={x}
                                    y1={0}
                                    y2={totalH}
                                    stroke="var(--success)"
                                    strokeWidth={1}
                                    strokeDasharray="3,3"
                                />
                                <text
                                    x={x + 4}
                                    y={HEADER_H + 10}
                                    fontSize={9}
                                    fill="var(--success)"
                                    fontFamily="var(--font-mono)"
                                >
                                    today
                                </text>
                            </g>
                        );
                    })()}

                </g>

                {/* 헤더/트랙 경계 라인 */}
                <line
                    x1={0}
                    x2={containerW}
                    y1={YEAR_H}
                    y2={YEAR_H}
                    stroke="var(--border-default)"
                    strokeWidth={0.5}
                />
                <line
                    x1={0}
                    x2={containerW}
                    y1={HEADER_H}
                    y2={HEADER_H}
                    stroke="var(--border-default)"
                    strokeWidth={1}
                />

                {/* 마지막 그룹 — dim overlay + range 핸들. 헤더/트랙 보더 위에 그려진다. */}
                <g clipPath="url(#edsc-track-clip)">
                    {(() => {
                        const xS = xFor(rangeStart.getTime());
                        const xE = xFor(rangeEnd.getTime());
                        const leftDimW = Math.max(0, Math.min(xS, PAD_LEFT + innerW) - PAD_LEFT);
                        const rightDimX = Math.max(PAD_LEFT, xE);
                        const rightDimW = Math.max(0, PAD_LEFT + innerW - rightDimX);
                        return (
                            <g style={{ pointerEvents: 'none' }}>
                                {leftDimW > 0 ? (
                                    <rect
                                        x={PAD_LEFT}
                                        y={HEADER_H}
                                        width={leftDimW}
                                        height={lanesH}
                                        fill="rgba(15,18,22,0.42)"
                                    />
                                ) : null}
                                {rightDimW > 0 ? (
                                    <rect
                                        x={rightDimX}
                                        y={HEADER_H}
                                        width={rightDimW}
                                        height={lanesH}
                                        fill="rgba(15,18,22,0.42)"
                                    />
                                ) : null}
                                {xE > xS ? (
                                    <rect
                                        x={Math.max(xS, PAD_LEFT)}
                                        y={HEADER_H}
                                        width={Math.max(0, Math.min(xE, PAD_LEFT + innerW) - Math.max(xS, PAD_LEFT))}
                                        height={lanesH}
                                        fill="transparent"
                                        stroke="var(--accent)"
                                        strokeWidth={1}
                                        strokeOpacity={0.5}
                                    />
                                ) : null}
                            </g>
                        );
                    })()}

                    {(['start', 'end'] as const).map((which) => {
                        const t = which === 'start' ? rangeStart.getTime() : rangeEnd.getTime();
                        const x = xFor(t);
                        const dateStr = formatYmd(which === 'start' ? rangeStart : rangeEnd);
                        const isActive = draggingHandle === which;
                        return (
                            <g
                                key={`handle-${which}`}
                                style={{ cursor: 'ew-resize' }}
                                onMouseDown={onHandleMouseDown(which)}
                            >
                                <title>{`${which === 'start' ? '시작' : '종료'}: ${dateStr} (드래그로 조절)`}</title>
                                <rect
                                    x={x - 8}
                                    y={0}
                                    width={16}
                                    height={totalH}
                                    fill="transparent"
                                />
                                <rect
                                    x={x - 2}
                                    y={0}
                                    width={4}
                                    height={totalH}
                                    fill="var(--accent)"
                                    fillOpacity={isActive ? 1 : 0.85}
                                />
                                <rect
                                    x={x - 5}
                                    y={HEADER_H - 10}
                                    width={10}
                                    height={20}
                                    fill="var(--accent)"
                                    rx={2}
                                />
                                <line
                                    x1={x - 1.5}
                                    x2={x - 1.5}
                                    y1={HEADER_H - 6}
                                    y2={HEADER_H + 6}
                                    stroke="#fff"
                                    strokeWidth={0.7}
                                    strokeOpacity={0.85}
                                />
                                <line
                                    x1={x + 1.5}
                                    x2={x + 1.5}
                                    y1={HEADER_H - 6}
                                    y2={HEADER_H + 6}
                                    stroke="#fff"
                                    strokeWidth={0.7}
                                    strokeOpacity={0.85}
                                />
                                <rect
                                    x={x - 38}
                                    y={totalH - 16}
                                    width={76}
                                    height={14}
                                    fill="var(--accent)"
                                    rx={2}
                                />
                                <text
                                    x={x}
                                    y={totalH - 5.5}
                                    fontSize={9.5}
                                    fontWeight={700}
                                    fill="#fff"
                                    textAnchor="middle"
                                    fontFamily="var(--font-mono)"
                                >
                                    {dateStr}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
}

function formatYmd(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/** 임의의 timestamp 를 자정(00:00) 으로 스냅. */
function startOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}
