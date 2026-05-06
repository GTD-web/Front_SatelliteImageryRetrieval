'use client';

/**
 * 저장된 AOI 의 위치를 시각적으로 보여주는 작은 SVG 썸네일.
 * 한반도(남한) 단순 윤곽 위에 AOI bbox 를 강조해 그린다.
 * 외부 타일/이미지에 의존하지 않으며 내장 SVG path 만 사용 — 라이브러리 메뉴/카드에 인라인 표시 용도.
 */

interface AoiThumbnailProps {
    nwLat: number;
    nwLon: number;
    seLat: number;
    seLon: number;
    width?: number;
    height?: number;
    /** 강조 색상. 기본 var(--accent). */
    accent?: string;
}

// 표시 영역(위도/경도 범위) — 남한 + 제주 + 동·서·남해 일부.
const MIN_LAT = 33.0;
const MAX_LAT = 38.8;
const MIN_LON = 124.5;
const MAX_LON = 131.5;

/**
 * 시계방향으로 한반도(남한) 본토를 단순화한 폴리곤. 정확한 측정용이 아니라
 * 사용자가 어느 지역인지 한눈에 인지할 정도의 윤곽만 제공.
 */
const KOREA_MAINLAND: Array<[number, number]> = [
    // [lat, lon] 시계방향. 휴전선 부근에서 시작해 동해안 → 남해안 → 서해안 → 인천 → 휴전선 서쪽.
    [38.6, 128.35],
    [38.4, 128.5],
    [37.7, 129.05],
    [37.0, 129.4],
    [36.6, 129.45],
    [36.05, 129.6],
    [35.5, 129.45],
    [35.1, 129.3],
    [34.95, 128.85],
    [34.55, 128.4],
    [34.4, 127.6],
    [34.5, 127.0],
    [34.3, 126.55],
    [34.7, 126.3],
    [35.2, 126.4],
    [35.7, 126.5],
    [36.4, 126.45],
    [37.0, 126.55],
    [37.4, 126.65],
    [37.8, 126.5],
    [38.0, 126.7],
    [38.3, 127.2],
    [38.4, 128.0],
];

const JEJU: Array<[number, number]> = [
    [33.55, 126.2],
    [33.55, 126.55],
    [33.4, 126.95],
    [33.2, 126.55],
    [33.2, 126.2],
    [33.35, 126.1],
];

export function AoiThumbnail({
    nwLat,
    nwLon,
    seLat,
    seLon,
    width = 100,
    height = 100,
    accent = 'var(--accent)',
}: AoiThumbnailProps) {
    const padX = 3;
    const padY = 3;
    const projX = (lon: number) =>
        padX + ((lon - MIN_LON) / (MAX_LON - MIN_LON)) * (width - 2 * padX);
    const projY = (lat: number) =>
        padY + ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * (height - 2 * padY);

    const toPath = (poly: Array<[number, number]>) =>
        'M ' +
        poly
            .map(([lat, lon]) => `${projX(lon).toFixed(1)},${projY(lat).toFixed(1)}`)
            .join(' L ') +
        ' Z';

    // AOI 직사각형 — viewBox 영역 밖으로 나가도 clip 으로 자연스럽게 잘리게 한다.
    const x1 = projX(nwLon);
    const y1 = projY(nwLat);
    const x2 = projX(seLon);
    const y2 = projY(seLat);
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.max(2, Math.abs(x2 - x1));
    const h = Math.max(2, Math.abs(y2 - y1));

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{
                background: 'var(--bg-1)',
                borderRadius: 4,
                border: '1px solid var(--border-subtle)',
                flexShrink: 0,
                display: 'block',
            }}
            aria-hidden
        >
            <defs>
                <clipPath id={`clip-${width}-${height}`}>
                    <rect x={0} y={0} width={width} height={height} />
                </clipPath>
            </defs>
            <g clipPath={`url(#clip-${width}-${height})`}>
                <path
                    d={toPath(KOREA_MAINLAND)}
                    fill="var(--bg-3)"
                    stroke="var(--border-default)"
                    strokeWidth={0.6}
                />
                <path
                    d={toPath(JEJU)}
                    fill="var(--bg-3)"
                    stroke="var(--border-default)"
                    strokeWidth={0.6}
                />
                <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={accent}
                    fillOpacity={0.35}
                    stroke={accent}
                    strokeWidth={1.5}
                />
            </g>
        </svg>
    );
}
