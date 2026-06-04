'use client';

import { useEffect, useMemo, useState } from 'react';

import { Icon, Modal, useConfirm, useToast } from '@/_ui/hifi';
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
    /** 회원가입 시 제출한 소속 기관. 초대로 생성된 계정은 비어 있을 수 있다. */
    organization: string;
    /** 회원가입 시 제출한 연락처(선택). */
    phone?: string;
    /** 회원가입 시 제출한 이용 목적. */
    purpose: string;
}

const INITIAL: User[] = [
    {
        email: 'kim@ksit.re.kr',
        name: '김연구원',
        role: 'downloader',
        status: 'active',
        joined: '2025-08-12',
        last: '2분 전',
        organization: '한국산업기술시험원',
        phone: '010-2345-6789',
        purpose: '포항 지역 지반 침하 모니터링용 SAR 시계열 분석',
    },
    {
        email: 'park@ksit.re.kr',
        name: '박지수',
        role: 'downloader',
        status: 'active',
        joined: '2025-09-03',
        last: '15분 전',
        organization: '한국산업기술시험원',
        phone: '010-3456-7890',
        purpose: '연안 변위 관측 정기 다운로드',
    },
    {
        email: 'lee@labs.kr',
        name: '이민호',
        role: 'viewer',
        status: 'active',
        joined: '2026-01-14',
        last: '1시간 전',
        organization: '지오랩스',
        purpose: '연구용 InSAR 산출물 열람',
    },
    {
        email: 'choi@univ.ac.kr',
        name: '최윤라',
        role: 'pending',
        status: 'pending',
        joined: '2026-04-23',
        last: '—',
        organization: '○○대학교 지구환경과학과',
        phone: '010-5678-1234',
        purpose: '석사 논문 — 경주 단층대 지표 변위 분석을 위해 Sentinel-1 SLC 데이터가 필요합니다.',
    },
    {
        email: 'jung@ksit.re.kr',
        name: '정소현',
        role: 'pending',
        status: 'pending',
        joined: '2026-04-24',
        last: '—',
        organization: '한국산업기술시험원',
        phone: '010-6789-2345',
        purpose: '신규 입사자 — 다운로드 권한 요청 (팀장 승인 예정)',
    },
    {
        email: 'hong@ksit.re.kr',
        name: '홍길동',
        role: 'admin',
        status: 'active',
        joined: '2024-03-01',
        last: '어제',
        organization: '한국산업기술시험원',
        phone: '010-1111-2222',
        purpose: '플랫폼 운영 관리자',
    },
    {
        email: 'yoon@ksit.re.kr',
        name: '윤재민',
        role: 'viewer',
        status: 'inactive',
        joined: '2025-02-20',
        last: '3개월 전',
        organization: '지오랩스',
        purpose: '단기 프로젝트 종료로 비활성화됨',
    },
];

export default function UsersPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const [users, setUsers] = useState<User[]>(INITIAL);
    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
    const [roleFilter, setRoleFilter] = useState<'전체' | UserRole>('전체');
    const [editing, setEditing] = useState<User | null>(null);
    const [reviewing, setReviewing] = useState<User | null>(null);
    const [inviteOpen, setInviteOpen] = useState(false);

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
            sub: '승인하면 viewer 권한으로 활성화되고, 사용자에게 초기 비밀번호 설정 메일이 발송됩니다.',
            confirmLabel: '승인',
        });
        if (!ok) return;
        setUsers((prev) =>
            prev.map((u) =>
                u.email === email ? { ...u, status: 'active' as UserStatus, role: 'viewer' as UserRole, last: '방금' } : u,
            ),
        );
        setReviewing(null);
        // Mock: 백엔드 연결 후 승인 시 초기 비밀번호 설정 토큰을 생성하고
        // /set-password?token=... 링크를 담은 메일을 큐잉한다.
        toast(`${email} 승인됨 · 초기 비밀번호 설정 메일을 발송했습니다`, { tone: 'success' });
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
        setReviewing(null);
        toast(`${email} 거절됨`);
    };

    const invite = (email: string, role: Exclude<UserRole, 'pending'>) => {
        // Mock: 백엔드 연결 후 POST /api/v1/auth/invitations 로 교체(초대 토큰 메일 발송).
        setUsers((prev) => {
            if (prev.some((u) => u.email.toLowerCase() === email.toLowerCase())) return prev;
            return [
                {
                    email,
                    name: email.split('@')[0],
                    role,
                    status: 'pending' as UserStatus,
                    joined: '초대됨',
                    last: '—',
                    organization: '',
                    purpose: '관리자 초대',
                },
                ...prev,
            ];
        });
        setInviteOpen(false);
        toast(`${email} 으로 초대 메일을 전송했습니다`, { tone: 'success', title: '초대 발송' });
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
                        onClick={() => setInviteOpen(true)}
                        data-testid="users-invite-btn"
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
                                <th>기관</th>
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
                                        <td style={{ maxWidth: 200 }}>
                                            {u.organization ? (
                                                <span
                                                    style={{
                                                        fontSize: 12.5,
                                                        display: 'block',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                    title={u.organization}
                                                >
                                                    {u.organization}
                                                </span>
                                            ) : (
                                                <span className="faint" style={{ fontSize: 12 }}>
                                                    —
                                                </span>
                                            )}
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
                                                            className="btn btn--ghost btn--sm"
                                                            onClick={() => setReviewing(u)}
                                                        >
                                                            상세
                                                        </button>
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
            {reviewing ? (
                <SignupRequestModal
                    user={reviewing}
                    onClose={() => setReviewing(null)}
                    onApprove={() => approve(reviewing.email)}
                    onReject={() => reject(reviewing.email)}
                />
            ) : null}
            {inviteOpen ? <InviteModal onClose={() => setInviteOpen(false)} onInvite={invite} /> : null}
        </div>
    );
}

interface SignupRequestModalProps {
    user: User;
    onClose: () => void;
    onApprove: () => void;
    onReject: () => void;
}

/** 가입 요청 상세 — 회원가입 시 제출한 기관/연락처/이용 목적을 검토하고 승인·거절한다. */
function SignupRequestModal({ user, onClose, onApprove, onReject }: SignupRequestModalProps) {
    return (
        <Modal
            title="가입 요청 상세"
            sub="회원가입 시 제출된 정보를 확인한 뒤 승인하세요"
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn btn--danger" onClick={onReject}>
                        거절
                    </button>
                    <button type="button" className="btn btn--primary" onClick={onApprove}>
                        승인하고 메일 발송
                    </button>
                </>
            }
        >
            <div className="col gap-3">
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
                        {user.name.slice(0, 2)}
                    </div>
                    <div className="col" style={{ gap: 2, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                        <div className="mono faint" style={{ fontSize: 12 }}>
                            {user.email}
                        </div>
                    </div>
                </div>

                <DetailRow label="소속 기관" value={user.organization || '—'} />
                <DetailRow label="연락처" value={user.phone || '미입력'} mono />
                <DetailRow label="가입 요청일" value={user.joined} mono />

                <div>
                    <div className="field-label">이용 목적</div>
                    <div
                        style={{
                            padding: 12,
                            background: 'var(--bg-2)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 8,
                            fontSize: 13,
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                        }}
                    >
                        {user.purpose || '—'}
                    </div>
                </div>
            </div>
        </Modal>
    );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="between" style={{ alignItems: 'baseline', gap: 16 }}>
            <span className="faint" style={{ fontSize: 12.5, flexShrink: 0 }}>
                {label}
            </span>
            <span
                className={mono ? 'mono' : undefined}
                style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'right' }}
            >
                {value}
            </span>
        </div>
    );
}

interface InviteModalProps {
    onClose: () => void;
    onInvite: (email: string, role: Exclude<UserRole, 'pending'>) => void;
}

/** 초대 메일 입력 폼 — 이메일 + 부여할 역할 + 안내 메시지(선택). */
function InviteModal({ onClose, onInvite }: InviteModalProps) {
    const toast = useToast();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<Exclude<UserRole, 'pending'>>('viewer');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const submit = () => {
        const trimmed = email.trim();
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            toast('올바른 이메일을 입력하세요', { tone: 'warning' });
            return;
        }
        setSending(true);
        // Mock: 실제로는 초대 토큰을 만들어 메일을 발송한다. message 는 메일 본문에 포함.
        setTimeout(() => {
            setSending(false);
            onInvite(trimmed, role);
        }, 500);
    };

    return (
        <Modal
            title="사용자 초대"
            sub="초대 메일로 가입 링크를 보냅니다. 수락 시 지정한 역할로 활성화됩니다."
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn" onClick={onClose} disabled={sending}>
                        취소
                    </button>
                    <button type="button" className="btn btn--primary" onClick={submit} disabled={sending}>
                        {sending ? '전송 중…' : '초대 보내기'}
                    </button>
                </>
            }
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
                className="col gap-3"
            >
                <div>
                    <label className="field-label">이메일 *</label>
                    <input
                        className="input"
                        type="email"
                        placeholder="you@ksit.re.kr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                        autoComplete="email"
                    />
                </div>
                <div>
                    <label className="field-label">부여할 역할</label>
                    <select
                        className="select"
                        style={{ width: '100%' }}
                        value={role}
                        onChange={(e) => setRole(e.target.value as Exclude<UserRole, 'pending'>)}
                    >
                        {EDITABLE_USER_ROLES.map((r) => (
                            <option key={r} value={r}>
                                {USER_ROLE_LABELS[r]}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="field-label">안내 메시지 (선택)</label>
                    <textarea
                        className="input"
                        rows={3}
                        placeholder="초대 메일에 함께 전달할 메시지를 입력하세요"
                        style={{
                            width: '100%',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            padding: '8px 10px',
                            fontSize: 13,
                        }}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </div>
                <button type="submit" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
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
                                <div className="between" style={{ gap: 16 }}>
                                    <span className="faint" style={{ flexShrink: 0 }}>
                                        소속 기관
                                    </span>
                                    <span style={{ textAlign: 'right' }}>{draft.organization || '—'}</span>
                                </div>
                                <div className="between" style={{ gap: 16 }}>
                                    <span className="faint" style={{ flexShrink: 0 }}>
                                        연락처
                                    </span>
                                    <span className="mono">{draft.phone || '미입력'}</span>
                                </div>
                                <div className="between" style={{ gap: 16, alignItems: 'flex-start' }}>
                                    <span className="faint" style={{ flexShrink: 0 }}>
                                        이용 목적
                                    </span>
                                    <span style={{ textAlign: 'right', lineHeight: 1.5 }}>
                                        {draft.purpose || '—'}
                                    </span>
                                </div>
                                <div
                                    className="between"
                                    style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}
                                >
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
