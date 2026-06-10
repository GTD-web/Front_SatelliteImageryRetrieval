import type { UsersUI } from '../../../_mocks/users.ui-interface';

/**
 * SWR 키 팩토리 — queries 와 commands(mutate) 가 동일 키를 공유한다.
 */
export function createUsersKey(params?: UsersUI.UserListParams) {
    return ['users', 'list', params?.keyword ?? ''] as const;
}
