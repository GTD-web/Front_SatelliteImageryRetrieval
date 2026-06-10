'use client';

import { useMemo } from 'react';

import {
    Icon,
    MapCanvas,
    type MapPoint,
    type MapRasterOverlay,
    type MapVelocityLegend,
} from '@/_ui/hifi';
import { useInsarResultsContext } from '../../_context/InsarResultsContext';
import {
    COLORMAP_GRADIENTS,
    COLORMAP_OPTIONS,
    DEFAULT_MAP_CENTER,
    LAYER_META,
    PRODUCT_CENTERS,
} from '../../_constants/insar-results-layers';
import { buildInsarRaster, productExtent } from '../../_constants/insar-results-raster';

/** 지도 + 오버레이(레이어/컬러맵/투명도/범위) — InSAR 산출물 미리보기와 시계열 점 선택. */
export function ResultsMapPanel() {
    const {
        current,
        points,
        layer,
        changeLayer,
        colormap,
        setColormap,
        opacity,
        setOpacity,
        rangeMin,
        rangeMax,
        fitKey,
        addPointAt,
        removePoint,
    } = useInsarResultsContext();

    const productId = current?.id ?? 'pohang-q4';

    const resultsPoints = useMemo<MapPoint[]>(
        () =>
            points.map((p) => ({
                id: p.id,
                coord: [p.lon, p.lat] as [number, number],
                color: p.color,
                label: p.id,
                onClick: () => removePoint(p.id),
            })),
        [points, removePoint],
    );

    const rasterSrc = useMemo(
        () => buildInsarRaster({ productId, layer, colormap, rangeMin, rangeMax }),
        [productId, layer, colormap, rangeMin, rangeMax],
    );

    const mapRaster = useMemo<MapRasterOverlay | null>(() => {
        if (!rasterSrc) return null;
        return {
            src: rasterSrc,
            extent: productExtent(productId),
            opacity: opacity / 100,
        };
    }, [rasterSrc, productId, opacity]);

    /** 지도 우상단 범례 외관 — 현재 layer/colormap/range 와 동기화. */
    const mapLegend = useMemo<MapVelocityLegend>(() => {
        const meta = LAYER_META[layer];
        const fmt = (n: number) =>
            Number.isInteger(n) ? n.toString() : n.toFixed(Math.abs(n) < 1 ? 2 : 1);
        const lo = Math.min(rangeMin, rangeMax);
        const hi = Math.max(rangeMin, rangeMax);
        const mid = (lo + hi) / 2;
        return {
            title: `${meta.label} (${meta.unit})`,
            gradient: COLORMAP_GRADIENTS[colormap],
            min: fmt(lo),
            mid: fmt(mid),
            max: hi >= 0 ? `+${fmt(hi)}` : fmt(hi),
            // 컬러맵·투명도 컨트롤을 지도 범례 위젯 안에서 직접 조작한다.
            colormap: {
                value: colormap,
                options: COLORMAP_OPTIONS,
                onChange: (id: string) => setColormap(id as typeof colormap),
            },
            opacity: { value: opacity, onChange: setOpacity },
        };
    }, [layer, colormap, rangeMin, rangeMax, opacity, setColormap, setOpacity]);

    return (
        <div style={{ flex: 1, position: 'relative', minHeight: 200, isolation: 'isolate' }}>
            <MapCanvas
                center={PRODUCT_CENTERS[productId] ?? DEFAULT_MAP_CENTER}
                zoom={10}
                points={resultsPoints}
                raster={mapRaster}
                onMapClick={(coord) => addPointAt(coord[0], coord[1])}
                showLegend
                legend="velocity"
                legendOptions={mapLegend}
                tools={[]}
                fitKey={fitKey}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        padding: '6px 12px',
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 6,
                        fontSize: 12,
                        boxShadow: 'var(--shadow-md)',
                        pointerEvents: 'none',
                        zIndex: 3,
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                    }}
                >
                    <Icon name="mapPin" size={11} style={{ marginRight: 6, opacity: 0.6 }} />
                    {/* 컨테이너는 pointerEvents:none(지도 클릭 통과) — select 만 auto 로 살린다. */}
                    <select
                        value={layer}
                        onChange={(e) => changeLayer(e.target.value as typeof layer)}
                        aria-label="레이어 선택"
                        style={{
                            pointerEvents: 'auto',
                            background: 'var(--bg-3)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 4,
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11.5,
                            fontWeight: 600,
                            padding: '1px 4px',
                            cursor: 'pointer',
                        }}
                    >
                        {(Object.keys(LAYER_META) as Array<typeof layer>).map((k) => (
                            <option key={k} value={k}>
                                {k}
                            </option>
                        ))}
                    </select>
                    <span style={{ marginLeft: 6 }}>· {opacity}% · 지도 클릭 → 시계열 점 추가</span>
                </div>
            </MapCanvas>
        </div>
    );
}
