'use client';

/**
 * 사용자 목록 SWR 조회
 *
 * - Context 는 서버 데이터를 useState 로 들지 않고, 이 훅의 SWR 결과를 그대로 전달한다.
 * - 필터/검색/선택은 UI 상태로 Context 가 보관하고, 여기서는 원본 목록만 가져온다.
 * - 반환하는 listKey 는 commands 가 mutate 로 재검증할 때 사용한다.
 */
import { useMemo } from 'react';
import useSWR from 'swr';

import type { IUsersService } from '../../../_services/users.service.interface';
import type { UsersUI } from '../../../_mocks/users.ui-interface';
import { createUsersKey } from '../utils/swr-keys';

interface Params {
    service: IUsersService;
    listParams: UsersUI.UserListParams;
}

export function useUsersQuery({ service, listParams }: Params) {
    const listKey = useMemo(() => createUsersKey(listParams), [listParams]);

    const { data, error, isLoading } = useSWR(
        listKey,
        () => service.사용자_목록을_조회한다(listParams),
        { revalidateOnFocus: false, dedupingInterval: 3000 },
    );

    const users: UsersUI.User[] = useMemo(
        () => (data?.success && data.data ? data.data.users : []),
        [data],
    );

    return {
        users,
        isLoading,
        error,
        /** commands 가 mutate 호출 시 사용 */
        listKey,
    };
}
