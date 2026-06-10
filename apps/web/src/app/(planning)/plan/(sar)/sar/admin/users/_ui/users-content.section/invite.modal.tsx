'use client';

import { useState } from 'react';

import { Modal, useToast } from '@/_ui/hifi';
import { useUsersContext } from '../../_context/UsersContext';
import type { UsersUI } from '../../_mocks/users.ui-interface';
import { EDITABLE_USER_ROLES, USER_ROLE_LABELS } from '../../_constants/users-labels';

/** 초대 메일 입력 폼 — 이메일 + 부여할 역할 + 안내 메시지(선택). */
export function InviteModal() {
    const toast = useToast();
    const { inviteOpen, setInviteOpen, 사용자를_초대한다 } = useUsersContext();

    // 폼 입력은 모달 로컬 상태로 둔다(서버 데이터 아님).
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UsersUI.Role>('user');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    if (!inviteOpen) return null;

    const close = () => setInviteOpen(false);

    const submit = () => {
        const trimmed = email.trim();
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            toast('올바른 이메일을 입력하세요', { tone: 'warning' });
            return;
        }
        setSending(true);
        // Mock: 실제로는 초대 토큰을 만들어 메일을 발송한다. message 는 메일 본문에 포함.
        setTimeout(async () => {
            const ok = await 사용자를_초대한다({ email: trimmed, role, message });
            setSending(false);
            if (ok) setInviteOpen(false);
        }, 500);
    };

    return (
        <Modal
            title="사용자 초대"
            sub="초대 메일로 가입 링크를 보냅니다. 수락 시 지정한 역할로 활성화됩니다."
            onClose={close}
            footer={
                <>
                    <button type="button" className="btn" onClick={close} disabled={sending}>
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
                        onChange={(e) => setRole(e.target.value as UsersUI.Role)}
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
