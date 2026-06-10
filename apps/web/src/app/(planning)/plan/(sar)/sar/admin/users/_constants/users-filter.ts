import type { UsersUI } from '../_mocks/users.ui-interface';

/** 상태 필터 ('all' + 사용자 상태) */
export type StatusFilter = 'all' | UsersUI.Status;

/** 역할 필터 ('전체' + 사용자 역할) */
export type RoleFilter = '전체' | UsersUI.Role;
