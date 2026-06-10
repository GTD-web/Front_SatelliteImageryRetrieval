'use client';

import { useEffect, useState } from 'react';

import { Icon } from '@/_ui/hifi';
import { useUsersContext } from '../../_context/UsersContext';
import type { UsersUI } from '../../_mocks/users.ui-interface';
import { EDITABLE_USER_ROLES, USER_ROLE_LABELS, USER_STATUS_LABELS } from '../../_constants/users-labels';

/**
 * 우측 슬라이드 편집 패널. `editing`이 null이면 닫힌 상태(translateX 100%).
 *
 * 닫히는 애니메이션 동안에도 내용이 비지 않도록 `draft`는 새 사용자가 열릴 때만 초기화하고
 * `editing`이 null이 돼도 마지막 값을 유지한다. (NotificationsOverlay 드로어 패턴 계승.)
 */
export function UserEditPanel() {
    const { editing, setEditing, 사용자를_수정한다 } = useUsersContext();
    const user = editing;
    const open = user != null;

    // draft는 편집 대상 사용자의 스냅샷. 읽기 전용 필드(email/joined/last)까지 담아두면
    // 닫히는(translateX) 애니메이션 동안 editing이 null이 돼도 패널 내용이 비지 않는다.
    const [draft, setDraft] = useState<UsersUI.User | null>(null);

    const onClose = () => setEditing(null);

    // 새 사용자가 선택돼 열릴 때만 draft를 그 값으로 초기화한다.
    // `editing` 상태의 객체 참조는 부모 리렌더 동안 안정적이라 편집 중 덮어쓰이지 않는다.
    useEffect(() => {
        if (user) setDraft({ ...user });
    }, [user]);

    // 열린 동안 Escape로 닫고, 배경 스크롤을 잠근다.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setEditing(null);
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, setEditing]);

    const dirty =
        user != null &&
        draft != null &&
        (draft.name.trim() !== user.name || draft.role !== user.role || draft.status !== user.status);

    const submit = async () => {
        if (!draft || !draft.name.trim()) return;
        const ok = await 사용자를_수정한다(draft.email, {
            name: draft.name.trim(),
            role: draft.role,
            status: draft.status,
        });
        if (ok) setEditing(null);
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
                <div className="between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
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
                                        setDraft((d) => (d ? { ...d, role: e.target.value as UsersUI.Role } : d))
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
                                        setDraft((d) => (d ? { ...d, status: e.target.value as UsersUI.Status } : d))
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
                                    <span style={{ textAlign: 'right', lineHeight: 1.5 }}>{draft.purpose || '—'}</span>
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
                                onClick={() => void submit()}
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
