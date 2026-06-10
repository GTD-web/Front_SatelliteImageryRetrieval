import type { DownloadsUI } from '../_mocks/downloads.ui-interface';

/**
 * 내 다운로드 UI 서비스 (Plan / Current 동일 인터페이스)
 *
 * - 조회는 잡 목록 1개.
 * - NAS 스테이징 진행/큐 슬롯 충원은 클라이언트 시뮬레이션이지만, 서버 상태를 변경하는
 *   mutation 으로 보고 단건/틱 단위 메서드로 노출한다. (Current 에서는 폴링으로 대체될 자리)
 * - 일괄 동작은 command 레이어에서 반복 호출한다.
 */
export interface IDownloadsService {
    다운로드_잡_목록을_조회한다(): Promise<
        DownloadsUI.ServiceResponseWithData<DownloadsUI.JobListResponse>
    >;

    /** NAS 스테이징 진행을 한 틱 전진시킨다 (running 잡 progress 증가/완료 처리) */
    스테이징_진행을_시뮬레이션한다(): Promise<
        DownloadsUI.ServiceResponseWithData<DownloadsUI.JobListResponse>
    >;

    /** 슬롯이 비면 대기(queued) 잡 1건을 running 으로 승격한다 */
    대기_잡을_시작한다(): Promise<
        DownloadsUI.ServiceResponseWithData<DownloadsUI.JobListResponse>
    >;

    /** 실패한 잡을 재시도 대기열로 보낸다 */
    다운로드를_재시도한다(id: string): Promise<DownloadsUI.ServiceResponse>;

    /** 완료된 잡을 NAS → 로컬로 받는다 */
    NAS에서_다운로드한다(id: string): Promise<DownloadsUI.ServiceResponse>;
}
