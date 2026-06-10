'use client';

/**
 * 지도 + 타임라인 패널 — AOI 그리기/편집, 선택 scene 풋프린트, 공통 커버리지,
 * scene 가져오기 로딩 오버레이, 하단 기간 타임라인.
 */
import { MapCanvas } from '@/_ui/hifi';

import { RequestTimelinePanel } from '../../../../../_components/SceneTimelinePanel';
import { useInsarRequestContext } from '../../_context/InsarRequestContext';

export function MapPanel() {
    const {
        form,
        initialCenter,
        mapAoi,
        mapFootprints,
        activeTool,
        setActiveTool,
        fitKey,
        previewAoi,
        handleDrawEnd,
        onAoiChange,
        fetchingScenes,
        setDateRange,
    } = useInsarRequestContext();

    return (
        <div className="split__main">
            <div style={{ flex: 1, position: 'relative', minHeight: 200, isolation: 'isolate' }}>
                <MapCanvas
                    center={initialCenter}
                    zoom={10}
                    aoi={mapAoi}
                    footprints={mapFootprints}
                    tools={['bbox']}
                    activeTool={activeTool}
                    onToolSelect={setActiveTool}
                    onDrawEnd={handleDrawEnd}
                    // preview 중에는 사용자가 지도에서 AOI 를 드래그/리사이즈해도 무시.
                    onAoiChange={onAoiChange}
                    showLegend={false}
                    fitKey={fitKey}
                >
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 12,
                            left: 12,
                            padding: '6px 10px',
                            background: 'var(--bg-2)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 6,
                            fontSize: 11,
                            boxShadow: 'var(--shadow-md)',
                            pointerEvents: 'none',
                            zIndex: 3,
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                            lineHeight: 1.3,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: 18,
                                    height: 0,
                                    borderTop: '1.5px dashed #818cf8',
                                }}
                            />
                            <span>AOI 영역</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: 18,
                                    height: 0,
                                    borderTop: '1.5px solid #10b981',
                                }}
                            />
                            <span>공통 커버리지</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: 18,
                                    height: 0,
                                    borderTop: '1.5px solid #22d3ee',
                                }}
                            />
                            <span>선택/hover scene</span>
                        </div>
                    </div>
                    {activeTool === 'bbox' ? (
                        <div
                            style={{
                                position: 'absolute',
                                top: 12,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                padding: '8px 14px',
                                background: 'var(--accent)',
                                color: '#fff',
                                borderRadius: 6,
                                fontSize: 12.5,
                                fontWeight: 500,
                                boxShadow: 'var(--shadow-md)',
                                zIndex: 5,
                                pointerEvents: 'none',
                            }}
                        >
                            지도에서 드래그해 사각형 AOI 를 그리세요 · ESC 로 취소
                        </div>
                    ) : null}
                </MapCanvas>
                {/* scene 가져오기 로딩 오버레이 */}
                <div
                    aria-live="polite"
                    aria-hidden={!fetchingScenes}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(15, 18, 22, 0.45)',
                        backdropFilter: fetchingScenes ? 'blur(2px)' : 'blur(0px)',
                        zIndex: 10,
                        opacity: fetchingScenes ? 1 : 0,
                        pointerEvents: fetchingScenes ? 'all' : 'none',
                        transition: 'opacity 220ms ease, backdrop-filter 220ms ease',
                    }}
                >
                    <div
                        className="row gap-2"
                        style={{
                            background: 'var(--bg-2)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 6,
                            padding: '10px 16px',
                            fontSize: 13,
                            boxShadow: 'var(--shadow-md)',
                            alignItems: 'center',
                        }}
                    >
                        <span
                            aria-hidden
                            style={{
                                display: 'inline-block',
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                border: '2px solid var(--accent)',
                                borderTopColor: 'transparent',
                                animation: 'spin 0.8s linear infinite',
                            }}
                        />
                        <span>사용 가능한 scene 가져오는 중…</span>
                    </div>
                </div>
            </div>

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
                <RequestTimelinePanel
                    rangeStart={form.startDate}
                    rangeEnd={form.endDate}
                    onRangeChange={(s, e) => setDateRange(s, e)}
                />
            </div>
        </div>
    );
}
