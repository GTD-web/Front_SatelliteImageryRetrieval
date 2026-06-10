'use client';

import { MapCanvas } from '@/_ui/hifi';
import { useAoisContext } from '../../_context/AoisContext';

export function AoiMapPanel() {
    const { footprints, focus, activeTool, setActiveTool, handleDrawEnd } = useAoisContext();

    return (
        <div className="split__main">
            <div style={{ flex: 1, padding: 16 }}>
                <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div className="card__header">
                        <div className="card__title">AOI 지도</div>
                        <span className="faint" style={{ fontSize: 12 }}>
                            지도 툴박스의 <b>사각형</b> 도구로 새 AOI 를 그릴 수 있습니다
                        </span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <MapCanvas
                            footprints={footprints}
                            center={[129.0, 36.2]}
                            zoom={7}
                            focus={focus}
                            activeTool={activeTool}
                            tools={['bbox']}
                            onToolSelect={(t) => setActiveTool(activeTool === t ? undefined : t)}
                            onDrawEnd={handleDrawEnd}
                        >
                            {activeTool === 'bbox' ? (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 12,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        zIndex: 6,
                                        background: 'var(--bg-2)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: 6,
                                        padding: '6px 12px',
                                        fontSize: 12.5,
                                        boxShadow: 'var(--shadow-md)',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    지도에서 드래그해 사각형 AOI 를 그리세요 · ESC 로 취소
                                </div>
                            ) : null}
                        </MapCanvas>
                    </div>
                </div>
            </div>
        </div>
    );
}
