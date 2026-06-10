'use client';

import { useAnalysisQaContext } from '../../_context/AnalysisQaContext';
import { AnalysisQaToolbar } from './analysis-qa-toolbar.module';
import { QaKpiCards } from './qa-kpi-cards.widget';
import { QaTable } from './qa-table.module';
import { DetailPanel } from './detail.panel';
import { ReprocessQueue } from './reprocess-queue.panel';
import { MetricProfile } from './metric-profile.panel';
import { MetricGlossaryModal } from './metric-glossary.modal';

export function AnalysisQaContent() {
    const { glossaryOpen, setGlossaryOpen } = useAnalysisQaContext();

    return (
        <div className="col" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <AnalysisQaToolbar />

            <div className="col gap-4" style={{ padding: 24 }}>
                {/* KPI */}
                <QaKpiCards />

                <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 12 }}>
                    {/* 산출물별 QA 테이블 */}
                    <QaTable />

                    {/* 선택 산출물 상세 */}
                    <DetailPanel />
                </div>

                {/* 재처리 권장 큐 + 포트폴리오 지표 프로파일 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 12 }}>
                    <ReprocessQueue />
                    <MetricProfile />
                </div>
            </div>

            {/* QA 지표 설명 — 툴바의 '지표 설명' 버튼으로 모달 오픈 */}
            {glossaryOpen ? <MetricGlossaryModal onClose={() => setGlossaryOpen(false)} /> : null}
        </div>
    );
}
