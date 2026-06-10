import type { AuditLogsUI } from '../_mocks/audit-logs.ui-interface';

/**
 * 감사 로그 UI 서비스 (Plan / Current 동일 인터페이스)
 *
 * 감사 로그는 읽기 전용이라 목록 조회만 노출한다. 필터/검색/카테고리/기간은
 * 모두 클라이언트 UI 상태이며, 서비스는 원본 로그 묶음만 반환한다.
 * CSV 내보내기는 이미 받아온 로그를 직렬화하는 보조 메서드로 제공한다.
 */
export interface IAuditLogsService {
    감사_로그_목록을_조회한다(
        params?: AuditLogsUI.LogListParams,
    ): Promise<AuditLogsUI.ServiceResponseWithData<AuditLogsUI.LogListResponse>>;

    /** 주어진 로그 목록을 CSV 문자열로 직렬화한다. (파일 다운로드는 호출부에서 처리) */
    감사_로그를_CSV로_직렬화한다(
        logs: AuditLogsUI.Log[],
    ): Promise<AuditLogsUI.ServiceResponseWithData<string>>;
}
