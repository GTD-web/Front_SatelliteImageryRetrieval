/**
 * 분석 품질(InSAR QA) Plan 서비스 — Mock 위임
 */
import { mockAnalysisQaService } from '../_mocks/analysis-qa.mock';
import type { IAnalysisQaService } from './analysis-qa.service.interface';

export const analysisQaPlanService: IAnalysisQaService = {
    분석품질_요약을_조회한다: () => mockAnalysisQaService.분석품질_요약을_조회한다(),
    산출물_재처리를_요청한다: (name) => mockAnalysisQaService.산출물_재처리를_요청한다(name),
};
