'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { HifiPrefsProvider, Icon, Modal, ToastProvider, useToast } from '@/_ui/hifi';

import { AuthHeroPane } from '../_hero';

export default function LoginPage() {
    return (
        <HifiPrefsProvider>
            <ToastProvider>
                <LoginView />
            </ToastProvider>
        </HifiPrefsProvider>
    );
}

function LoginView() {
    const toast = useToast();
    const router = useRouter();
    const [email, setEmail] = useState('kim@ksit.re.kr');
    const [pw, setPw] = useState('password123');
    const [loading, setLoading] = useState(false);
    const [clientIp, setClientIp] = useState<string | null>(null);
    const [forgotOpen, setForgotOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/me/ip', { cache: 'no-store' })
            .then((r) => r.json())
            .then((d: { ip?: string }) => {
                if (!cancelled) setClientIp(typeof d.ip === 'string' && d.ip ? d.ip : '');
            })
            .catch(() => {
                if (!cancelled) setClientIp('');
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!email || !pw) {
            toast('이메일과 비밀번호를 입력하세요', { tone: 'warning' });
            return;
        }
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            toast('로그인 성공', { tone: 'success' });
            router.push('/plan/sar/user/search');
        }, 600);
    };

    return (
        <div style={{ height: '100vh', display: 'flex', background: 'var(--bg-0)' }}>
            <AuthHeroPane />
            <div style={{ flex: '1 1 45%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                <form style={{ width: 360 }} onSubmit={submit}>
                    <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>
                        로그인
                    </div>
                    <div className="muted" style={{ fontSize: 13.5, marginBottom: 28 }}>
                        사내 계정으로 접속합니다 (IP 화이트리스트 적용)
                    </div>
                    <div className="col gap-3">
                        <div>
                            <label className="field-label">이메일</label>
                            <input
                                className="input"
                                placeholder="you@ksit.re.kr"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                            />
                        </div>
                        <div>
                            <div className="between" style={{ marginBottom: 4 }}>
                                <label className="field-label" style={{ marginBottom: 0 }}>
                                    비밀번호
                                </label>
                                <a
                                    className="faint"
                                    style={{ fontSize: 11.5, cursor: 'pointer' }}
                                    onClick={() => setForgotOpen(true)}
                                >
                                    찾기
                                </a>
                            </div>
                            <input
                                className="input"
                                type="password"
                                value={pw}
                                onChange={(e) => setPw(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                        <label
                            className="row gap-2"
                            style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--text-secondary)' }}
                        >
                            <input type="checkbox" className="checkbox" defaultChecked />
                            <span>로그인 유지</span>
                        </label>
                        <button
                            type="submit"
                            className="btn btn--primary"
                            style={{ height: 38, marginTop: 4 }}
                            disabled={loading}
                        >
                            {loading ? '인증 중…' : '로그인 →'}
                        </button>
                        <div
                            className="row gap-2"
                            style={{ fontSize: 12, justifyContent: 'center', color: 'var(--text-tertiary)', marginTop: 8 }}
                        >
                            <span>처음이신가요?</span>
                            <Link href="/signup" style={{ color: 'var(--accent)' }}>
                                회원가입
                            </Link>
                        </div>
                    </div>
                    <div
                        className="col gap-2"
                        style={{
                            marginTop: 28,
                            padding: 12,
                            background: 'var(--bg-2)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 8,
                            fontSize: 11.5,
                        }}
                    >
                        <div className="row gap-2 faint">
                            <Icon name="shield" size={12} />
                            <span>
                                접속 IP{' '}
                                <b className="mono" style={{ color: 'var(--text-secondary)' }}>
                                    {clientIp === null ? '확인 중…' : clientIp || '감지 불가'}
                                </b>
                                {clientIp ? ' 화이트리스트 확인됨' : null}
                            </span>
                        </div>
                    </div>
                </form>
            </div>
            {forgotOpen ? (
                <ForgotPasswordModal
                    initialEmail={email}
                    onClose={() => setForgotOpen(false)}
                    onSent={(addr) => {
                        toast(`${addr} 으로 비밀번호 재설정 메일을 전송했습니다`, {
                            tone: 'success',
                            title: '전송 완료',
                        });
                        setForgotOpen(false);
                    }}
                />
            ) : null}
        </div>
    );
}

interface ForgotPasswordModalProps {
    initialEmail: string;
    onClose: () => void;
    onSent: (email: string) => void;
}

function ForgotPasswordModal({ initialEmail, onClose, onSent }: ForgotPasswordModalProps) {
    const toast = useToast();
    const [addr, setAddr] = useState(initialEmail);
    const [sending, setSending] = useState(false);

    const send = (e: FormEvent) => {
        e.preventDefault();
        const trimmed = addr.trim();
        if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
            toast('올바른 이메일을 입력하세요', { tone: 'warning' });
            return;
        }
        setSending(true);
        setTimeout(() => {
            setSending(false);
            onSent(trimmed);
        }, 600);
    };

    return (
        <Modal
            title="비밀번호 찾기"
            sub="가입하신 이메일로 재설정 링크를 보내드립니다"
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn" onClick={onClose} disabled={sending}>
                        취소
                    </button>
                    <button
                        type="button"
                        className="btn btn--primary"
                        onClick={send}
                        disabled={sending}
                    >
                        {sending ? '전송 중…' : '전송하기'}
                    </button>
                </>
            }
        >
            <form onSubmit={send} className="col gap-3">
                <div>
                    <label className="field-label">이메일</label>
                    <input
                        className="input"
                        type="email"
                        placeholder="you@ksit.re.kr"
                        value={addr}
                        onChange={(e) => setAddr(e.target.value)}
                        autoFocus
                        autoComplete="email"
                    />
                </div>
                <div className="faint" style={{ fontSize: 12, lineHeight: 1.55 }}>
                    이메일이 사내 계정으로 등록되어 있어야 합니다. 메일이 도착하지 않으면 관리자에게 문의하세요.
                </div>
                {/* 폼 enter 키 제출용 hidden submit */}
                <button type="submit" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}
