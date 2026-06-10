'use client';

/** 중앙 지도 패널 — MapCanvas + AOI 그리기 배너 + "scene 검색 중…" 오버레이. */
import { MapCanvas } from '@/_ui/hifi';
import { aoiToRing } from '@/_shared/contexts/SavedAoisContext';

import { useSearchContext } from '../../_context/SearchContext';

export function MapPanel() {
    const {
        hasSearched,
        previewAoi,
        footprints,
        aoi,
        activeTool,
        startDrawAoi,
        handleDrawEnd,
        onAoiChange,
        fitKey,
        isSearching,
    } = useSearchContext();

    return (
        <div
            style={{
                flex: 1,
                minHeight: 200,
                transition: 'min-height 260ms ease',
                position: 'relative',
                isolation: 'isolate',
            }}
        >
            <MapCanvas
                center={[129.37, 36.02]}
                zoom={8}
                // preview 중이면 그려진 AOI 대신 미리보기를 표시 — 호버를 떼면 원래 AOI 로 복귀.
                footprints={hasSearched && !previewAoi ? footprints : []}
                aoi={previewAoi ? aoiToRing(previewAoi) : aoi}
                activeTool={activeTool}
                tools={['bbox']}
                onToolSelect={startDrawAoi}
                onDrawEnd={handleDrawEnd}
                onAoiChange={onAoiChange}
                fitKey={fitKey}
            >
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
                        지도에서 드래그해 사각형 AOI를 그리세요 · ESC 취소
                    </div>
                ) : null}
            </MapCanvas>
            {/* 항상 마운트해서 opacity/transform 으로 페이드인/아웃. */}
            <div
                aria-live="polite"
                aria-hidden={!isSearching}
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(15, 18, 22, 0.45)',
                    backdropFilter: isSearching ? 'blur(2px)' : 'blur(0px)',
                    zIndex: 10,
                    opacity: isSearching ? 1 : 0,
                    pointerEvents: isSearching ? 'all' : 'none',
                    transition: 'opacity 220ms ease, backdrop-filter 220ms ease',
                }}
            >
                <div
                    className="row gap-2"
                    style={{
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 8,
                        padding: '12px 18px',
                        boxShadow: 'var(--shadow-md)',
                        alignItems: 'center',
                        transform: isSearching ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(4px)',
                        opacity: isSearching ? 1 : 0,
                        transition: 'transform 240ms cubic-bezier(0.2, 0.7, 0.3, 1), opacity 220ms ease',
                    }}
                >
                    <span
                        aria-hidden
                        style={{
                            display: 'inline-block',
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: '2px solid var(--accent)',
                            borderTopColor: 'transparent',
                            animation: 'spin 0.8s linear infinite',
                        }}
                    />
                    <span style={{ fontSize: 13 }}>scene 검색 중…</span>
                </div>
            </div>
        </div>
    );
}
