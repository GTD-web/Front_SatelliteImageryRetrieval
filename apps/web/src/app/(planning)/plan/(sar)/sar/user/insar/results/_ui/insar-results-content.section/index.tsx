'use client';

import { useInsarResultsContext } from '../../_context/InsarResultsContext';
import { ResultsSidebar } from './results-sidebar.section';
import { ResultsMapPanel } from './results-map.panel';
import { TimeseriesPanel } from './timeseries.panel';
import { ScenesModal } from './scenes.modal';

/** InSAR 결과 뷰어 본문 — 좌측 사이드바 / 지도+시계열 / 원본 scene 모달. */
export function InsarResultsContent() {
    const { current, showScenes, setShowScenes } = useInsarResultsContext();

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <div className="split" style={{ flex: 1 }}>
                <ResultsSidebar />

                <div className="split__main">
                    <ResultsMapPanel />
                    <TimeseriesPanel />
                </div>
            </div>
            {showScenes && current ? (
                <ScenesModal product={current} onClose={() => setShowScenes(false)} />
            ) : null}
        </div>
    );
}
