import type { AoisUI } from '../_mocks/aois.ui-interface';

/**
 * 저장된 AOI 라이브러리 UI 서비스 (Plan / Current 동일 인터페이스)
 *
 * Context 의 queries/commands 는 이 계약에만 의존하며,
 * Plan(Mock) / Current(실제 API) 구현을 주입받아 환경을 분기한다.
 */
export interface IAoisService {
    AOI_목록을_조회한다(
        params?: AoisUI.AoiListParams,
    ): Promise<AoisUI.ServiceResponseWithData<AoisUI.AoiListResponse>>;

    AOI를_등록한다(input: AoisUI.CreateAoiInput): Promise<AoisUI.ServiceResponseWithData<AoisUI.Aoi>>;

    AOI를_수정한다(input: AoisUI.RenameAoiInput): Promise<AoisUI.ServiceResponseWithData<AoisUI.Aoi>>;

    AOI를_삭제한다(id: string): Promise<AoisUI.ServiceResponse>;
}
