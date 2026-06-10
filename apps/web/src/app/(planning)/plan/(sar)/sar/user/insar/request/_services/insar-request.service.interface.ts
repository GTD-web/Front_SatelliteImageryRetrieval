import type { InsarRequestUI } from '../_mocks/insar-request.ui-interface';

/**
 * InSAR 분석 요청 UI 서비스 (Plan / Current 동일 인터페이스)
 *
 * Context 의 queries/commands 는 이 계약에만 의존하며,
 * Plan(Mock) / Current(실제 API) 구현을 주입받아 환경을 분기한다.
 *
 * ⚠️ AOI 저장/불러오기는 이 서비스에 포함하지 않는다(공유 SavedAoisContext 담당).
 */
export interface IInsarRequestService {
    /** AOI+기간+미션으로 가용 scene 카탈로그를 조회한다. */
    가용_씬을_조회한다(
        params: InsarRequestUI.AvailableScenesParams,
    ): Promise<InsarRequestUI.ServiceResponseWithData<InsarRequestUI.AvailableScene[]>>;

    /** 위치(AOI)+기간으로 세 기법(DInSAR/SBAS/PSInSAR)의 예상 적합도를 평가한다. */
    기법_적합도를_평가한다(
        params: InsarRequestUI.AssessParams,
    ): Promise<InsarRequestUI.ServiceResponseWithData<InsarRequestUI.Recommendation[]>>;

    /** 폼 + 선택된 scene 으로 InSAR 분석 요청을 제출한다. */
    InSAR_요청을_제출한다(
        params: InsarRequestUI.SubmitParams,
    ): Promise<InsarRequestUI.ServiceResponseWithData<InsarRequestUI.SubmitResult>>;
}
