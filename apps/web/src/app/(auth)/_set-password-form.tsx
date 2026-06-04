'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Icon, useToast } from '@/_ui/hifi';

/**
 * 초기 비밀번호 설정 폼.
 *
 * 관리자 가입 승인 메일의 링크(`/set-password?token=...&email=...`)로 진입한다.
 * `token`/`email` 은 메일 링크 쿼리에서 읽고, 비밀번호 설정 완료 후 로그인 화면으로 보낸다.
 * 현재는 mock(setTimeout) — 백엔드 연결 시 POST /api/v1/auth/set-password 로 교체한다.
 */
export function SetPasswordForm() {
    const toast = useToast();
    const router = useRouter();
    const params = useSearchParams();
    const email = params.get('email') ?? '';
    const token = params.get('token') ?? '';

    const [pw, setPw] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!pw || !confirm) {
            toast('비밀번호를 입력하세요', { tone: 'warning' });
            return;
        }
        if (pw.length < 8) {
            toast('비밀번호는 8자 이상이어야 합니다', { tone: 'warning' });
            return;
        }
        if (pw !== confirm) {
            toast('비밀번호가 일치하지 않습니다', { tone: 'warning' });
            return;
        }
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setDone(true);
            toast('비밀번호가 설정되었습니다', { tone: 'success' });
        }, 700);
    };

    if (done) {
        return (
            <div className="col gap-3" style={{ width: 360, maxWidth: '100%', alignItems: 'stretch' }}>
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--accent-soft)',
                        color: 'var(--accent)',
                        alignSelf: 'flex-start',
                    }}
                >
                    <Icon name="check" size={22} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
                    비밀번호 설정 완료
                </div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>
                    이제 설정하신 비밀번호로 로그인할 수 있습니다.
                </div>
                <button
                    type="button"
                    className="btn btn--primary"
                    style={{ height: 38 }}
                    onClick={() => router.push('/login')}
                >
                    로그인하러 가기 →
                </button>
            </div>
        );
    }

    return (
        <form style={{ width: 360, maxWidth: '100%' }} onSubmit={submit}>
            <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>
                초기 비밀번호 설정
            </div>
            <div className="muted" style={{ fontSize: 13.5, marginBottom: 24 }}>
                가입이 승인되었습니다. 처음 사용할 비밀번호를 설정하세요.
            </div>
            <div className="col gap-3">
                <div>
                    <label className="field-label">이메일</label>
                    <input
                        className="input mono"
                        value={email || '(메일 링크로 자동 입력됩니다)'}
                        disabled
                        readOnly
                    />
                </div>
                <div>
                    <label className="field-label">새 비밀번호 *</label>
                    <input
                        className="input"
                        type="password"
                        placeholder="8자 이상"
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        autoFocus
                        autoComplete="new-password"
                    />
                </div>
                <div>
                    <label className="field-label">새 비밀번호 확인 *</label>
                    <input
                        className="input"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        autoComplete="new-password"
                    />
                </div>
                {!token ? (
                    <div
                        className="row gap-2"
                        style={{
                            padding: 10,
                            background: 'var(--warning-soft, var(--bg-2))',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 8,
                            fontSize: 11.5,
                            color: 'var(--text-tertiary)',
                        }}
                    >
                        <Icon name="shield" size={12} />
                        <span>
                            유효한 설정 토큰이 없습니다. 승인 메일의 링크로 접속했는지 확인하세요. (데모에서는
                            그대로 진행할 수 있습니다.)
                        </span>
                    </div>
                ) : null}
                <button
                    type="submit"
                    className="btn btn--primary"
                    style={{ height: 38, marginTop: 4 }}
                    disabled={loading}
                >
                    {loading ? '설정 중…' : '비밀번호 설정 →'}
                </button>
                <div
                    className="row gap-2"
                    style={{
                        fontSize: 12,
                        justifyContent: 'center',
                        color: 'var(--text-tertiary)',
                        marginTop: 4,
                    }}
                >
                    <span>이미 설정하셨나요?</span>
                    <a
                        onClick={() => router.push('/login')}
                        style={{ color: 'var(--accent)', cursor: 'pointer' }}
                    >
                        로그인
                    </a>
                </div>
            </div>
        </form>
    );
}
