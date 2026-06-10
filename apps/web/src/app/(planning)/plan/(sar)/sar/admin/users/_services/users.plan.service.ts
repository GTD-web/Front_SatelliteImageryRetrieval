/**
 * 사용자 관리 Plan 서비스 — Mock 위임
 */
import { mockUsersService } from '../_mocks/users.mock';
import type { IUsersService } from './users.service.interface';

export const usersPlanService: IUsersService = {
    사용자_목록을_조회한다: (params) => mockUsersService.사용자_목록을_조회한다(params),
    가입을_승인한다: (email) => mockUsersService.가입을_승인한다(email),
    가입을_거절한다: (email) => mockUsersService.가입을_거절한다(email),
    사용자를_초대한다: (input) => mockUsersService.사용자를_초대한다(input),
    사용자를_수정한다: (email, patch) => mockUsersService.사용자를_수정한다(email, patch),
};
