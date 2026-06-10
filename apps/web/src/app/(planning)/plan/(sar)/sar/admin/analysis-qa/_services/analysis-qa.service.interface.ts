import type { AnalysisQaUI } from '../_mocks/analysis-qa.ui-interface';

/**
 * 분석 품질(InSAR QA) UI 서비스 (Plan / Current 동일 인터페이스)
 *
 * 산출물별 신뢰도 지표는 한 화면이 함께 그리는 묶음이므로 단일 요약으로 반환한다.
 * 재처리 요청은 산출물(name) 단위로만 노출한다.
 */
export interface IAnalysisQaService {
    분석품질_요약을_조회한다(): Promise<
        AnalysisQaUI.ServiceResponseWithData<AnalysisQaUI.QaSummary>
    >;

    산출물_재처리를_요청한다(name: string): Promise<AnalysisQaUI.ServiceResponse>;
}
