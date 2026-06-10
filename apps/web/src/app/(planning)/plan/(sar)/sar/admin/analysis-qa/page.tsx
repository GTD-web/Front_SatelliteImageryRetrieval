'use client';

import { AnalysisQaProvider } from './_context/AnalysisQaContext';
import { AnalysisQaContent } from './_ui/analysis-qa-content.section';
import { analysisQaPlanService } from './_services/analysis-qa.plan.service';

export default function AnalysisQaPage() {
    return (
        <AnalysisQaProvider uiService={analysisQaPlanService}>
            <AnalysisQaContent />
        </AnalysisQaProvider>
    );
}
