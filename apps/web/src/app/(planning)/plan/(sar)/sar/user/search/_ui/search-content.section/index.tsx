'use client';

/** Scene 검색 본문 — 좌측 필터 사이드바 / 지도 + 결과 패널 / scene 상세 모달 / AOI 팝오버. */
import { useSearchContext } from '../../_context/SearchContext';
import { FilterSidebar } from './filter-sidebar.section';
import { MapPanel } from './map-panel';
import { ResultsPanel } from './results-panel.section';
import { SceneDetailModal } from './scene-detail.modal';
import { AoiPopover } from './aoi-popover.modal';

export function SearchContent() {
    const { sceneModal, closeSceneModal, inCart, 씬을_담고_안내한다 } = useSearchContext();

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <div className="split" style={{ flex: 1 }}>
                <FilterSidebar />

                {/* CENTER 지도 + 결과 — 카트는 상단 네비 아이콘으로 접근(우측 오버레이). */}
                <div className="split__main">
                    <MapPanel />
                    <ResultsPanel />
                </div>
            </div>

            {sceneModal ? (
                <SceneDetailModal
                    scene={sceneModal}
                    inCart={inCart(sceneModal.id)}
                    onClose={closeSceneModal}
                    onAddToCart={(s) => 씬을_담고_안내한다(s)}
                />
            ) : null}

            <AoiPopover />
        </div>
    );
}
