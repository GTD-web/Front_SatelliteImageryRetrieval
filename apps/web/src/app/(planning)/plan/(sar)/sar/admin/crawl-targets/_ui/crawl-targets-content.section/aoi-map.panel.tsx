'use client';

import { useMemo } from 'react';

import { MapCanvas, type MapFootprint, type MapTool } from '@/_ui/hifi';
import type { DrawnGeometry } from '@/_ui/hifi/MapCanvas';
import { useCrawlTargetsContext } from '../../_context/CrawlTargetsContext';
import { statusToFootprintKind } from '../../_constants/crawl-targets-status';

export function AoiMapPanel() {
    const { aois, selected, setSelected, activeTool, setActiveTool, openShp, AOI를_생성한다 } =
        useCrawlTargetsContext();

    const footprints = useMemo<MapFootprint[]>(
        () =>
            aois.map((a) => ({
                id: a.name,
                coords: a.coords,
                kind: statusToFootprintKind(a.status),
                label: a.name,
                active: selected === a.name,
                onClick: () => setSelected(a.name),
            })),
        [aois, selected, setSelected],
    );

    const counts = useMemo(() => {
        const c = { healthy: 0, warning: 0, failed: 0 };
        for (const a of aois) {
            if (a.status === 'healthy') c.healthy++;
            else if (a.status === 'failed') c.failed++;
            else c.warning++;
        }
        return c;
    }, [aois]);

    const handleDrawEnd = (_tool: MapTool, geometry: DrawnGeometry) => {
        if (geometry.type !== 'Polygon') return;
        const outer = (geometry.coordinates as number[][][])[0];
        if (outer && outer.length >= 4) {
            const ring = outer
                .slice(0, outer.length - 1)
                .map(([lon, lat]) => [lon, lat] as [number, number]);
            void AOI를_생성한다({ coords: ring });
            setActiveTool(undefined);
        }
    };

    return (
        <div className="split__main">
            <div style={{ flex: 1, padding: 16 }}>
                <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div className="card__header">
                        <div className="card__title">AOI 지도 · 상태 색상</div>
                        <div className="row gap-1">
                            <span className="chip">
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        background: 'var(--success)',
                                        borderRadius: 50,
                                        display: 'inline-block',
                                    }}
                                />
                                &nbsp;정상 {counts.healthy}
                            </span>
                            <span className="chip">
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        background: 'var(--warning)',
                                        borderRadius: 50,
                                        display: 'inline-block',
                                    }}
                                />
                                &nbsp;경고 {counts.warning}
                            </span>
                            <span className="chip">
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        background: 'var(--danger)',
                                        borderRadius: 50,
                                        display: 'inline-block',
                                    }}
                                />
                                &nbsp;실패 {counts.failed}
                            </span>
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <MapCanvas
                            footprints={footprints}
                            center={[129.0, 36.0]}
                            zoom={7}
                            activeTool={activeTool}
                            onToolSelect={(t) => {
                                if (t === 'upload') {
                                    openShp();
                                    return;
                                }
                                setActiveTool(activeTool === t ? undefined : t);
                            }}
                            onDrawEnd={handleDrawEnd}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
