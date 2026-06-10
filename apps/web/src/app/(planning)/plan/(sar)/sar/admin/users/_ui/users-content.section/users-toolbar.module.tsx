'use client';

import { useMemo } from 'react';

import { Icon } from '@/_ui/hifi';
import { useUsersContext } from '../../_context/UsersContext';
import type { RoleFilter } from '../../_constants/users-filter';
import { USER_ROLE_LABELS, USER_ROLES } from '../../_constants/users-labels';

export function UsersToolbar() {
    const { users, q, setQ, statusFilter, setStatusFilter, roleFilter, setRoleFilter, setInviteOpen } =
        useUsersContext();

    const counts = useMemo(
        () => ({
            all: users.length,
            pending: users.filter((u) => u.status === 'pending').length,
            active: users.filter((u) => u.status === 'active').length,
            inactive: users.filter((u) => u.status === 'inactive').length,
        }),
        [users],
    );

    return (
        <div className="toolbar">
            <input
                className="input input--search"
                placeholder="이메일 / 이름 검색…"
                style={{ width: 320 }}
                value={q}
                onChange={(e) => setQ(e.target.value)}
            />
            <div className="row gap-1">
                <span
                    className={`chip${statusFilter === 'all' ? ' chip--active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                >
                    전체 {counts.all}
                </span>
                <span
                    className={`chip${statusFilter === 'pending' ? ' chip--active' : ''}`}
                    onClick={() => setStatusFilter('pending')}
                >
                    승인 대기{' '}
                    <span className="badge badge--warning" style={{ marginLeft: 4, padding: '0 6px', fontSize: 10 }}>
                        {counts.pending}
                    </span>
                </span>
                <span
                    className={`chip${statusFilter === 'active' ? ' chip--active' : ''}`}
                    onClick={() => setStatusFilter('active')}
                >
                    활성 {counts.active}
                </span>
                <span
                    className={`chip${statusFilter === 'inactive' ? ' chip--active' : ''}`}
                    onClick={() => setStatusFilter('inactive')}
                >
                    비활성 {counts.inactive}
                </span>
            </div>
            <div className="row gap-2" style={{ marginLeft: 'auto', alignItems: 'center' }}>
                <span className="faint" style={{ fontSize: 12 }}>
                    역할
                </span>
                <select
                    className="select"
                    style={{ width: 140 }}
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                >
                    <option value="전체">전체</option>
                    {USER_ROLES.map((r) => (
                        <option key={r} value={r}>
                            {USER_ROLE_LABELS[r]}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => setInviteOpen(true)}
                    data-testid="users-invite-btn"
                >
                    <Icon name="plus" size={13} /> 초대
                </button>
            </div>
        </div>
    );
}
