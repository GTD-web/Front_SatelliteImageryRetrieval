import type { UsersUI } from '../_mocks/users.ui-interface';

/**
 * 사용자 관리 UI 서비스 (Plan / Current 동일 인터페이스)
 *
 * 승인/거절/초대/수정을 각각 단건(per-email) 메서드로 노출한다.
 * command 레이어가 토스트/확인 다이얼로그를 붙여 호출한다.
 */
export interface IUsersService {
    사용자_목록을_조회한다(
        params?: UsersUI.UserListParams,
    ): Promise<UsersUI.ServiceResponseWithData<UsersUI.UserListResponse>>;

    가입을_승인한다(email: string): Promise<UsersUI.ServiceResponse>;

    가입을_거절한다(email: string): Promise<UsersUI.ServiceResponse>;

    사용자를_초대한다(input: UsersUI.InviteUserInput): Promise<UsersUI.ServiceResponse>;

    사용자를_수정한다(email: string, patch: UsersUI.UpdateUserInput): Promise<UsersUI.ServiceResponse>;
}
