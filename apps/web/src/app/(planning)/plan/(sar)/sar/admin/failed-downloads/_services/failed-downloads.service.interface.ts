import type { FailedDownloadsUI } from '../_mocks/failed-downloads.ui-interface';

/**
 * 실패한 다운로드 UI 서비스 (Plan / Current 동일 인터페이스)
 *
 * 일괄 재시도/무시는 command 레이어에서 단건 메서드를 반복 호출한다.
 * 서비스는 단건(per-id) 단위로만 노출한다.
 */
export interface IFailedDownloadsService {
    실패_다운로드_목록을_조회한다(
        params?: FailedDownloadsUI.FailedJobListParams,
    ): Promise<FailedDownloadsUI.ServiceResponseWithData<FailedDownloadsUI.FailedJobListResponse>>;

    다운로드를_재시도한다(id: string): Promise<FailedDownloadsUI.ServiceResponse>;

    다운로드를_무시한다(id: string): Promise<FailedDownloadsUI.ServiceResponse>;
}
