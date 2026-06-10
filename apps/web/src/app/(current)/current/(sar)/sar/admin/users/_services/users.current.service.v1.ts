/**
 * 사용자 관리 Current 서비스 v1 — 실제 API 연동 자리
 *
 * ⚠️ 백엔드 연결은 프론트 리팩토링 마무리 후 진행 예정.
 * 지금은 Plan 의 Context/UI 를 그대로 재사용할 수 있도록 계약(IUsersService)만
 * 충족하는 스텁이다. 각 메서드는 추후 `/api/sar/admin/users` BFF 라우트로 교체한다.
 *
 * BFF 연동 시 교체 지점:
 *   - 사용자_목록을_조회한다 → GET   /api/sar/admin/users
 *   - 가입을_승인한다       → POST  /api/sar/admin/users/{email}/approve
 *   - 가입을_거절한다       → POST  /api/sar/admin/users/{email}/reject
 *   - 사용자를_초대한다     → POST  /api/sar/admin/users/invitations
 *   - 사용자를_수정한다     → PATCH /api/sar/admin/users/{email}
 */
import type { IUsersService } from '@/app/(planning)/plan/(sar)/sar/admin/users/_services/users.service.interface';

const NOT_CONNECTED = '백엔드 미연결: 사용자 API 는 리팩토링 완료 후 연결됩니다.';

export const usersCurrentServiceV1: IUsersService = {
    async 사용자_목록을_조회한다() {
        return { success: false, message: NOT_CONNECTED, data: { users: [] } };
    },

    async 가입을_승인한다(email) {
        return { success: false, message: `${NOT_CONNECTED} (${email})` };
    },

    async 가입을_거절한다(email) {
        return { success: false, message: `${NOT_CONNECTED} (${email})` };
    },

    async 사용자를_초대한다(input) {
        return { success: false, message: `${NOT_CONNECTED} (${input.email})` };
    },

    async 사용자를_수정한다(email) {
        return { success: false, message: `${NOT_CONNECTED} (${email})` };
    },
};
