'use client';

import { useEffect, useMemo, useState } from 'react';

import { Icon, useConfirm, useToast } from '@/_ui/hifi';
import {
    EDITABLE_USER_ROLES,
    USER_ROLE_BADGE_CLASS,
    USER_ROLE_LABELS,
    USER_ROLES,
    USER_STATUS_CLASS,
    USER_STATUS_LABELS,
    type UserRole,
    type UserStatus,
} from '@/_shared/constants/user';

interface User {
    email: string;
    name: string;
    role: UserRole;
    status: UserStatus;
    joined: string;
    last: string;
}

const INITIAL: User[] = [
    { email: 'kim@ksit.re.kr', name: '김연구원', role: 'downloader', status: 'active', joined: '2025-08-12', last: '2분 전' },
    { email: 'park@ksit.re.kr', name: '박지수', role: 'downloader', status: 'active', joined: '2025-09-03', last: '15분 전' },
    { email: 'lee@labs.kr', name: '이민호', role: 'viewer', status: 'active', joined: '2026-01-14', last: '1시간 전' },
    { email: 'choi@univ.ac.kr', name: '최윤라', role: 'pending', status: 'pending', joined: '2026-04-23', last: '—' },
    { email: 'jung@ksit.re.kr', name: '정소현', role: 'pending', status: 'pending', joined: '2026-04-24', last: '—' },
    { email: 'hong@ksit.re.kr', name: '홍길동', role: 'admin', status: 'active', joined: '2024-03-01', last: '어제' },
    { email: 'yoon@ksit.re.kr', name: '윤재민', role: 'viewer', status: 'inactive', joined: '2025-02-20', last: '3개월 전' },
];

export default function UsersPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const [users, setUsers] = useState<User[]>(INITIAL);
    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
    const [roleFilter, setRoleFilter] = useState<'전체' | UserRole>('전체');
    const [editing, setEditing] = useState<User | null>(null);

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

    const counts = useMemo(
        () => ({
            all: users.length,
            pending: users.filter((u) => u.status === 'pending').length,
            active: users.filter((u) => u.status === 'active').length,
            inactive: users.filter((u) => u.status === 'inactive').length,
        }),
        [users],
    );

    const approve = async (email: string) => {
        const ok = await confirm({
            title: '가입 승인',
            body: `${email} 사용자의 가입을 승인하시겠습니까?`,
            sub: '승인하면 viewer 권한으로 활성화됩니다.',
            confirmLabel: '승인',
        });
        if (!ok) return;
        setUsers((prev) =>
            prev.map((u) =>
                u.email === email ? { ...u, status: 'active' as UserStatus, role: 'viewer' as UserRole, last: '방금' } : u,
            ),
        );
        toast(`${email} 승인됨`, { tone: 'success' });
    };
    const reject = async (email: string) => {
        const ok = await confirm({
            title: '가입 거절',
            body: `${email} 사용자의 가입을 거절하시겠습니까?`,
            sub: '거절하면 가입 요청이 목록에서 제거됩니다.',
            confirmLabel: '거절',
            danger: true,
        });
        if (!ok) return;
        setUsers((prev) => prev.filter((u) => u.email !== email));
        toast(`${email} 거절됨`);
    };

    const saveUser = (email: string, patch: { name: string; role: UserRole; status: UserStatus }) => {
        setUsers((prev) => prev.map((u) => (u.email === email ? { ...u, ...patch } : u)));
        toast(`${email} 정보가 저장되었습니다`, { tone: 'success' });
        setEditing(null);
    };

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
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
                        <span
                            className="badge badge--warning"
                            style={{ marginLeft: 4, padding: '0 6px', fontSize: 10 }}
                        >
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
                        onChange={(e) => setRoleFilter(e.target.value as '전체' | UserRole)}
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
                        onClick={() => toast('초대 메일 입력 폼 준비 중')}
                    >
                        <Icon name="plus" size={13} /> 초대
                    </button>
                </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                <div className="card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th className="checkbox-col">
                                    <input type="checkbox" className="checkbox" />
                                </th>
                                <th>사용자</th>
                                <th>역할</th>
                                <th>상태</th>
                                <th>가입일</th>
                                <th>최근 활동</th>
                                <th style={{ width: 180 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="empty" style={{ padding: 40 }}>
                                        일치하는 사용자가 없습니다
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((u) => (
                                    <tr
                                        key={u.email}
                                        style={
                                            u.status === 'pending'
                                                ? { background: 'var(--warning-soft)' }
                                                : undefined
                                        }
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
                                                        background:
                                                            'linear-gradient(135deg, var(--accent), var(--brand-2))',
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
                                                    <div className="mono faint" style={{ fontSize: 11.5 }}>
                                                        {u.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={USER_ROLE_BADGE_CLASS[u.role]}>
                                                {USER_ROLE_LABELS[u.role]}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={USER_STATUS_CLASS[u.status]}>
                                                {USER_STATUS_LABELS[u.status]}
                                            </span>
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
                                                            className="btn btn--outline-accent btn--sm"
                                                            onClick={() => approve(u.email)}
                                                        >
                                                            승인
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn--ghost btn--sm"
                                                            onClick={() => reject(u.email)}
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
            </div>
            <UserEditDrawer user={editing} onClose={() => setEditing(null)} onSave={saveUser} />
        </div>
    );
}

interface UserEditDrawerProps {
    user: User | null;
    onClose: () => void;
    onSave: (email: string, patch: { name: string; role: UserRole; status: UserStatus }) => void;
}

/**
 * 우측 슬라이드 편집 패널. `user`가 null이면 닫힌 상태(translateX 100%).
 *
 * 닫히는 애니메이션 동안에도 내용이 비지 않도록 `draft`는 새 사용자가 열릴 때만 초기화하고
 * `user`가 null이 돼도 마지막 값을 유지한다. (NotificationsOverlay 드로어 패턴 계승.)
 */
function UserEditDrawer({ user, onClose, onSave }: UserEditDrawerProps) {
    const open = user != null;
    // draft는 편집 대상 사용자의 스냅샷. 읽기 전용 필드(email/joined/last)까지 담아두면
    // 닫히는(translateX) 애니메이션 동안 user가 null이 돼도 패널 내용이 비지 않는다.
    const [draft, setDraft] = useState<User | null>(null);

    // 새 사용자가 선택돼 열릴 때만 draft를 그 값으로 초기화한다.
    // `editing` 상태의 객체 참조는 부모 리렌더 동안 안정적이라 편집 중 덮어쓰이지 않는다.
    useEffect(() => {
        if (user) setDraft({ ...user });
    }, [user]);

    // 열린 동안 Escape로 닫고, 배경 스크롤을 잠근다.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    const dirty =
        user != null &&
        draft != null &&
        (draft.name.trim() !== user.name || draft.role !== user.role || draft.status !== user.status);

    const submit = () => {
        if (!draft || !draft.name.trim()) return;
        onSave(draft.email, { name: draft.name.trim(), role: draft.role, status: draft.status });
    };

    return (
        <>
            <div
                aria-hidden="true"
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.35)',
                    opacity: open ? 1 : 0,
                    pointerEvents: open ? 'auto' : 'none',
                    transition: 'opacity 180ms ease',
                    zIndex: 59,
                    backdropFilter: 'blur(2px)',
                }}
            />
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="사용자 편집"
                aria-hidden={!open}
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    height: '100dvh',
                    width: 'min(420px, 100vw)',
                    background: 'var(--bg-1)',
                    borderLeft: '1px solid var(--border-default)',
                    transform: open ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 220ms ease',
                    zIndex: 60,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div
                    className="between"
                    style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}
                >
                    <div className="row gap-2">
                        <Icon name="users" size={16} />
                        <span style={{ fontWeight: 600 }}>사용자 편집</span>
                    </div>
                    <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm"
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        <Icon name="x" size={14} />
                    </button>
                </div>

                {draft ? (
                    <>
                        <div className="col" style={{ flex: 1, overflow: 'auto', padding: 16, gap: 16 }}>
                            <div className="row gap-3" style={{ alignItems: 'center' }}>
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--accent), var(--brand-2))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--accent-fg)',
                                        fontWeight: 600,
                                        fontSize: 15,
                                        flexShrink: 0,
                                    }}
                                >
                                    {draft.name.slice(0, 2)}
                                </div>
                                <div className="col" style={{ gap: 2, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600 }}>{draft.name}</div>
                                    <div className="mono faint" style={{ fontSize: 12 }}>
                                        {draft.email}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="field-label">이름</label>
                                <input
                                    className="input"
                                    value={draft.name}
                                    onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                                    autoComplete="name"
                                />
                            </div>

                            <div>
                                <label className="field-label">이메일</label>
                                <input className="input mono" value={draft.email} disabled readOnly />
                                <div className="faint" style={{ fontSize: 11.5, marginTop: 4 }}>
                                    이메일은 계정 식별자라 변경할 수 없습니다.
                                </div>
                            </div>

                            <div>
                                <label className="field-label">역할</label>
                                <select
                                    className="select"
                                    style={{ width: '100%' }}
                                    value={draft.role}
                                    onChange={(e) =>
                                        setDraft((d) => (d ? { ...d, role: e.target.value as UserRole } : d))
                                    }
                                >
                                    {EDITABLE_USER_ROLES.map((r) => (
                                        <option key={r} value={r}>
                                            {USER_ROLE_LABELS[r]}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="field-label">상태</label>
                                <select
                                    className="select"
                                    style={{ width: '100%' }}
                                    value={draft.status === 'active' ? 'active' : 'inactive'}
                                    onChange={(e) =>
                                        setDraft((d) => (d ? { ...d, status: e.target.value as UserStatus } : d))
                                    }
                                >
                                    <option value="active">{USER_STATUS_LABELS.active}</option>
                                    <option value="inactive">{USER_STATUS_LABELS.inactive}</option>
                                </select>
                            </div>

                            <div
                                className="col gap-2"
                                style={{
                                    marginTop: 4,
                                    padding: 12,
                                    background: 'var(--bg-2)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 8,
                                    fontSize: 12,
                                }}
                            >
                                <div className="between">
                                    <span className="faint">가입일</span>
                                    <span className="mono tabular">{draft.joined}</span>
                                </div>
                                <div className="between">
                                    <span className="faint">최근 활동</span>
                                    <span className="faint">{draft.last}</span>
                                </div>
                            </div>
                        </div>

                        <div
                            className="row gap-2"
                            style={{
                                padding: '12px 16px',
                                borderTop: '1px solid var(--border-subtle)',
                                justifyContent: 'flex-end',
                            }}
                        >
                            <button type="button" className="btn" onClick={onClose}>
                                취소
                            </button>
                            <button
                                type="button"
                                className="btn btn--primary"
                                onClick={submit}
                                disabled={!dirty || !draft.name.trim()}
                            >
                                저장
                            </button>
                        </div>
                    </>
                ) : null}
            </aside>
        </>
    );
}
