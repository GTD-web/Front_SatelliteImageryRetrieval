'use client';

import { AnalysisQaProvider } from '@/app/(planning)/plan/(sar)/sar/admin/analysis-qa/_context/AnalysisQaContext';
import { AnalysisQaContent } from '@/app/(planning)/plan/(sar)/sar/admin/analysis-qa/_ui/analysis-qa-content.section';
import { analysisQaCurrentServiceV1 } from './_services/analysis-qa.current.service.v1';

export default function CurrentAnalysisQaPage() {
    return (
        <AnalysisQaProvider uiService={analysisQaCurrentServiceV1}>
            <AnalysisQaContent />
        </AnalysisQaProvider>
    );
}
