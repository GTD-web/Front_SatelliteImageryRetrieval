'use client';

/** InSAR 분석 요청 본문 — 좌측 요청 사이드바 / 지도 + 기간 타임라인. */
import { MapPanel } from './map.panel';
import { RequestSidebar } from './request-sidebar.section';

export function InsarRequestContent() {
    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <div className="split" style={{ flex: 1 }}>
                <aside
                    className="split__side split__side--left"
                    style={{ width: 360, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                >
                    <RequestSidebar />
                </aside>

                <MapPanel />
            </div>
        </div>
    );
}
