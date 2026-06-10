'use client';

import { useMemo } from 'react';

import { useToast } from '@/_ui/hifi';
import { useUsersContext } from '../../_context/UsersContext';
import {
    USER_ROLE_BADGE_CLASS,
    USER_ROLE_LABELS,
    USER_STATUS_CLASS,
    USER_STATUS_LABELS,
} from '../../_constants/users-labels';

export function UsersTable() {
    const toast = useToast();
    const { users, q, statusFilter, roleFilter, setEditing, setReviewing, 가입을_승인한다, 가입을_거절한다 } =
        useUsersContext();

    const filtered = useMemo(
        () =>
            users.filter((u) => {
                if (q && !u.email.toLowerCase().includes(q.toLowerCase()) && !u.name.includes(q)) return false;
                if (statusFilter !== 'all' && u.status !== statusFilter) return false;
                if (roleFilter !== '전체' && u.role !== roleFilter) return false;
                return true;
            }),
        [users, q, statusFilter, roleFilter],
    );

    return (
        <div className="card">
            <table className="table">
                <thead>
                    <tr>
                        <th className="checkbox-col">
                            <input type="checkbox" className="checkbox" />
                        </th>
                        <th>사용자</th>
                        <th>이메일</th>
                        <th>역할</th>
                        <th>상태</th>
                        <th>가입일</th>
                        <th>최근 활동</th>
                        <th style={{ width: 200 }}></th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="empty" style={{ padding: 40 }}>
                                일치하는 사용자가 없습니다
                            </td>
                        </tr>
                    ) : (
                        filtered.map((u) => (
                            <tr
                                key={u.email}
                                style={u.status === 'pending' ? { background: 'var(--warning-soft)' } : undefined}
                            >
                                <td className="checkbox-col">
                                    <input type="checkbox" className="checkbox" />
                                </td>
                                <td>
                                    <div className="row gap-3">
                                        <div
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, var(--accent), var(--brand-2))',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--accent-fg)',
                                                fontWeight: 600,
                                                fontSize: 11,
                                            }}
                                        >
                                            {u.name.slice(0, 2)}
                                        </div>
                                        <div className="col" style={{ gap: 1 }}>
                                            <div style={{ fontWeight: 500 }}>{u.name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="mono faint" style={{ fontSize: 11.5 }}>
                                    {u.email}
                                </td>
                                <td>
                                    <span className={USER_ROLE_BADGE_CLASS[u.role]}>{USER_ROLE_LABELS[u.role]}</span>
                                </td>
                                <td>
                                    <span className={USER_STATUS_CLASS[u.status]}>{USER_STATUS_LABELS[u.status]}</span>
                                </td>
                                <td className="mono tabular faint" style={{ fontSize: 12 }}>
                                    {u.joined}
                                </td>
                                <td className="faint" style={{ fontSize: 12 }}>
                                    {u.last}
                                </td>
                                <td>
                                    <div className="row gap-1">
                                        {u.status === 'pending' ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn--ghost btn--sm"
                                                    onClick={() => setReviewing(u)}
                                                >
                                                    상세
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn--outline-accent btn--sm"
                                                    onClick={() => void 가입을_승인한다(u.email)}
                                                >
                                                    승인
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn--ghost btn--sm"
                                                    onClick={() => void 가입을_거절한다(u.email)}
                                                >
                                                    거절
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn--ghost btn--sm"
                                                    onClick={() => setEditing(u)}
                                                >
                                                    편집
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn--ghost btn--icon btn--sm"
                                                    data-tooltip="더보기"
                                                    onClick={() => toast('메뉴 준비 중')}
                                                >
                                                    ⋯
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
