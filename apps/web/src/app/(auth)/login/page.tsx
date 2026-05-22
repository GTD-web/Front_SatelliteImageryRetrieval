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

/**
 * 브라우저측에서 클라이언트 IP를 감지한다.
 *
 * Docker bridge SNAT 때문에 서버측 `/api/me/ip`는 항상 gateway IP(172.x.x.x)만 보게 되므로,
 * 진짜 방문자 IP를 알려면 브라우저에서 직접 시도해야 한다. 두 가지 경로:
 *
 * - **WebRTC + STUN**: ICE 후보에서 host(LAN) / srflx(외부 NAT 뒤 공개 IP)를 추출.
 *   최신 Chrome/Edge는 host 후보를 mDNS 호스트네임(`xxxx.local`)으로 마스킹하므로 LAN IP를
 *   못 얻을 수 있지만, STUN 서버가 응답하면 srflx 후보로 공개 IP는 얻을 수 있다.
 * - **공개 IP 에코 서비스(ipify)**: 평범한 HTTPS 요청. WebRTC가 전부 mDNS로 마스킹돼도
 *   공개 IP는 안전하게 얻는다. (인터넷 차단된 인트라넷에서는 실패할 수 있음.)
 *
 * 둘 다 실패하면 null. 호출자는 Docker gateway IP를 가짜로 표시하지 말고 "감지 불가"로 처리.
 */
async function detectClientIpViaWebRtc(): Promise<string | null> {
    if (typeof RTCPeerConnection === 'undefined') return null;
    return new Promise((resolve) => {
        let done = false;
        const ips = new Set<string>();
        const finish = (pc: RTCPeerConnection | null) => {
            if (done) return;
            done = true;
            if (pc) {
                try {
                    pc.close();
                } catch {
                    /* noop */
                }
            }
            // 의미 있는 IPv4만 선별: 루프백/링크로컬/Docker bridge 제외
            const ipv4 = [...ips].find((ip) => {
                if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false;
                if (ip.startsWith('0.') || ip.startsWith('127.') || ip.startsWith('169.254.')) return false;
                if (ip.startsWith('172.')) {
                    const second = Number(ip.split('.')[1]);
                    if (second >= 16 && second <= 31) return false;
                }
                return true;
            });
            resolve(ipv4 ?? null);
        };
        let pc: RTCPeerConnection | null = null;
        try {
            pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun.cloudflare.com:3478' },
                ],
            });
            pc.onicecandidate = (e) => {
                if (!e.candidate) {
                    finish(pc);
                    return;
                }
                const m = e.candidate.candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
                if (m) ips.add(m[1]);
            };
            pc.createDataChannel('');
            pc.createOffer()
                .then((o) => pc!.setLocalDescription(o))
                .catch(() => finish(pc));
            // STUN 응답까지 시간을 더 주기 위해 2.5초로 연장
            setTimeout(() => finish(pc), 2500);
        } catch {
            finish(pc);
        }
    });
}

async function detectPublicIpViaEcho(): Promise<string | null> {
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 2500);
        const res = await fetch('https://api.ipify.org?format=json', {
            cache: 'no-store',
            signal: ctrl.signal,
            credentials: 'omit',
        });
        clearTimeout(timer);
        if (!res.ok) return null;
        const d = (await res.json()) as { ip?: string };
        return typeof d?.ip === 'string' && d.ip ? d.ip : null;
    } catch {
        return null;
    }
}

interface IpState {
    ip: string;
    origin: 'server' | 'browser-lan' | 'browser-public' | 'unknown';
}

function LoginView() {
    const toast = useToast();
    const router = useRouter();
    const [email, setEmail] = useState('kim@ksit.re.kr');
    const [pw, setPw] = useState('password123');
    const [loading, setLoading] = useState(false);
    const [ipState, setIpState] = useState<IpState | null>(null);
    const [forgotOpen, setForgotOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function detect() {
            // 1) 서버측 우선: 운영 환경(리버스 프록시 + X-Forwarded-For)에서는 정확하다.
            let serverIp = '';
            let dockerNat = false;
            try {
                const res = await fetch('/api/me/ip', { cache: 'no-store' });
                const d = (await res.json()) as { ip?: string; dockerNat?: boolean };
                if (typeof d.ip === 'string') serverIp = d.ip;
                dockerNat = Boolean(d.dockerNat);
            } catch {
                /* noop */
            }

            if (!dockerNat && serverIp) {
                if (!cancelled) setIpState({ ip: serverIp, origin: 'server' });
                return;
            }

            // 2) 서버측이 Docker bridge gateway만 본 경우 → 브라우저측 두 가지 방법을 병렬로 시도.
            //    - WebRTC + STUN: LAN IP 또는 srflx 공개 IP
            //    - ipify 에코: 공개 IP (인터넷 가능 시 가장 신뢰도 높음)
            const [webrtcIp, publicIp] = await Promise.all([
                detectClientIpViaWebRtc(),
                detectPublicIpViaEcho(),
            ]);

            if (cancelled) return;

            // WebRTC 결과가 사설망 대역(192.168/10/172.16-31)이면 LAN IP, 아니면 공개 IP로 해석.
            // 단, Docker bridge 대역(172.16-31)은 WebRTC 단계에서 이미 걸러졌음.
            const isPrivate = (ip: string) =>
                ip.startsWith('10.') ||
                ip.startsWith('192.168.') ||
                /^172\.(1[6-9]|2\d|3[01])\./.test(ip);

            if (webrtcIp && isPrivate(webrtcIp)) {
                setIpState({ ip: webrtcIp, origin: 'browser-lan' });
            } else if (publicIp) {
                setIpState({ ip: publicIp, origin: 'browser-public' });
            } else if (webrtcIp) {
                // 사설망은 아니지만 WebRTC가 뭔가 반환했음 (드물게 공개 IP host candidate)
                setIpState({ ip: webrtcIp, origin: 'browser-public' });
            } else {
                // 어느 쪽도 못 찾았으면 서버측 Docker gateway는 표시하지 않고 정직하게 "감지 불가".
                setIpState({ ip: '', origin: 'unknown' });
            }
        }

        void detect();
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
                                    {ipState === null ? '확인 중…' : ipState.ip || '감지 불가'}
                                </b>
                                {ipState?.ip ? ' 화이트리스트 확인됨' : null}
                                {ipState?.origin === 'browser-lan' ? (
                                    <span className="faint" style={{ marginLeft: 4, fontSize: 10.5 }}>
                                        (LAN)
                                    </span>
                                ) : ipState?.origin === 'browser-public' ? (
                                    <span className="faint" style={{ marginLeft: 4, fontSize: 10.5 }}>
                                        (공개 IP)
                                    </span>
                                ) : null}
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
