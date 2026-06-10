import type { InsarResultsUI } from '../_mocks/insar-results.ui-interface';

/**
 * InSAR 결과 뷰어 UI 서비스 (Plan / Current 동일 인터페이스)
 *
 * 완료된 산출물 목록은 한 화면이 함께 그리는 묶음이라 단일 데이터로 반환한다.
 * 산출물별 통계/래스터/시계열은 클라이언트 결정적 mock 으로 파생하므로 서버 계약에는 없다.
 * 다운로드는 산출물 단위로만 노출한다.
 */
export interface IInsarResultsService {
    결과_데이터를_조회한다(): Promise<
        InsarResultsUI.ServiceResponseWithData<InsarResultsUI.ResultsData>
    >;

    산출물_다운로드를_요청한다(productId: string): Promise<InsarResultsUI.ServiceResponse>;
}
