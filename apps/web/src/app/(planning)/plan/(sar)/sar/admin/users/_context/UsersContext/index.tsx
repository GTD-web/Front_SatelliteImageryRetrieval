'use client';

/**
 * 사용자 관리 통합 Context — queries + commands + UI 상태 조립
 *
 * - Service 주입 패턴으로 Plan(Mock) / Current(실제 API) 환경 분기
 * - 서버 데이터(users)는 useState 로 들지 않고 queries(SWR) 결과를 그대로 전달
 * - q/statusFilter/roleFilter/모달 open flag/편집 draft 등 순수 UI 상태만 useState 로 보관
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { IUsersService } from '../../_services/users.service.interface';
import type { UsersUI } from '../../_mocks/users.ui-interface';
import type { RoleFilter, StatusFilter } from '../../_constants/users-filter';
import { useUsersQuery } from './queries/use-users-query';
import { useUsersCommands } from './commands/use-users-commands';

interface UsersContextValue {
    // 데이터 (SWR)
    users: UsersUI.User[];
    로딩중: boolean;
    오류: unknown;

    // UI 상태 — 검색 / 필터
    q: string;
    setQ: (q: string) => void;
    statusFilter: StatusFilter;
    setStatusFilter: (f: StatusFilter) => void;
    roleFilter: RoleFilter;
    setRoleFilter: (f: RoleFilter) => void;

    // UI 상태 — 편집 드로어 / 상세 모달 / 초대 모달
    editing: UsersUI.User | null;
    setEditing: (u: UsersUI.User | null) => void;
    reviewing: UsersUI.User | null;
    setReviewing: (u: UsersUI.User | null) => void;
    inviteOpen: boolean;
    setInviteOpen: (open: boolean) => void;

    // commands
    가입을_승인한다: (email: string) => Promise<boolean>;
    가입을_거절한다: (email: string) => Promise<boolean>;
    사용자를_초대한다: (input: UsersUI.InviteUserInput) => Promise<boolean>;
    사용자를_수정한다: (email: string, patch: UsersUI.UpdateUserInput) => Promise<boolean>;
}

const UsersContext = createContext<UsersContextValue | undefined>(undefined);

export function UsersProvider({
    children,
    uiService,
}: {
    children: ReactNode;
    uiService: IUsersService;
}) {
    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('전체');
    const [editing, setEditing] = useState<UsersUI.User | null>(null);
    const [reviewing, setReviewing] = useState<UsersUI.User | null>(null);
    const [inviteOpen, setInviteOpen] = useState(false);

    const listParams = useMemo<UsersUI.UserListParams>(() => ({}), []);

    const { users, isLoading, error, listKey } = useUsersQuery({ service: uiService, listParams });

    const { 가입을_승인한다, 가입을_거절한다, 사용자를_초대한다, 사용자를_수정한다 } = useUsersCommands({
        service: uiService,
        listKey,
    });

    const value = useMemo<UsersContextValue>(
        () => ({
            users,
            로딩중: isLoading,
            오류: error,
            q,
            setQ,
            statusFilter,
            setStatusFilter,
            roleFilter,
            setRoleFilter,
            editing,
            setEditing,
            reviewing,
            setReviewing,
            inviteOpen,
            setInviteOpen,
            가입을_승인한다,
            가입을_거절한다,
            사용자를_초대한다,
            사용자를_수정한다,
        }),
        [
            users,
            isLoading,
            error,
            q,
            statusFilter,
            roleFilter,
            editing,
            reviewing,
            inviteOpen,
            가입을_승인한다,
            가입을_거절한다,
            사용자를_초대한다,
            사용자를_수정한다,
        ],
    );

    return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsersContext(): UsersContextValue {
    const ctx = useContext(UsersContext);
    if (ctx == null) {
        throw new Error('useUsersContext는 UsersProvider 내부에서만 사용할 수 있습니다.');
    }
    return ctx;
}
