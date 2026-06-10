'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CartButton } from './CartOverlay';
import { Icon, type IconName } from './Icon';
import { useHifiPrefs } from './HifiPrefsProvider';
import { Modal } from './Modal';
import { NotificationsButton } from './NotificationsOverlay';
import { useToast } from './ToastProvider';

type Role = 'user' | 'admin';

interface NavItem {
    label: string;
    /** `${base}` 에 붙일 상대 경로. base 는 plan/current 환경에 따라 런타임에 결정된다. */
    path: string;
    icon: IconName;
    match: (path: string) => boolean;
}

/** 현재 경로 그룹(plan/current)에 맞는 nav 베이스 경로를 반환한다. */
function navBase(pathname: string): string {
    return pathname.startsWith('/current') ? '/current/sar' : '/plan/sar';
}

const USER_ITEMS: NavItem[] = [
    { label: '검색', path: '/user/search', icon: 'search', match: (p) => p.includes('/user/search') },
    { label: '다운로드', path: '/user/downloads', icon: 'download', match: (p) => p.includes('/user/downloads') },
    { label: '분석 요청', path: '/user/insar/request', icon: 'activity', match: (p) => p.includes('/user/insar/request') },
    { label: '분석 결과', path: '/user/insar/results', icon: 'layers', match: (p) => p.includes('/user/insar/results') },
    { label: 'AOI 관리', path: '/user/aois', icon: 'folder', match: (p) => p.includes('/user/aois') },
];

const ADMIN_ITEMS: NavItem[] = [
    { label: '대시보드', path: '/admin/dashboard', icon: 'chart', match: (p) => p.includes('/admin/dashboard') },
    { label: '검색', path: '/admin/search', icon: 'search', match: (p) => p.includes('/admin/search') },
    { label: '사용자', path: '/admin/users', icon: 'users', match: (p) => p.includes('/admin/users') },
    { label: '크롤 AOI', path: '/admin/crawl-targets', icon: 'mapPin', match: (p) => p.includes('/admin/crawl-targets') },
    { label: 'Sync', path: '/admin/sync-monitor', icon: 'refresh', match: (p) => p.includes('/admin/sync-monitor') },
    { label: '분석 품질', path: '/admin/analysis-qa', icon: 'shield', match: (p) => p.includes('/admin/analysis-qa') },
    { label: '실패한 다운로드', path: '/admin/failed-downloads', icon: 'download', match: (p) => p.includes('/admin/failed-downloads') },
    { label: '감사', path: '/admin/audit-logs', icon: 'clock', match: (p) => p.includes('/admin/audit-logs') },
];

export function SideNav() {
    const pathname = usePathname() ?? '';
    const { theme, toggleTheme } = useHifiPrefs();

    const base = navBase(pathname);
    const role: Role = pathname.includes('/admin/') ? 'admin' : 'user';
    const items = role === 'admin' ? ADMIN_ITEMS : USER_ITEMS;
    const homeHref = `${base}${role === 'admin' ? '/admin/dashboard' : '/user/search'}`;

    return (
        <aside className="sidenav">
            <Link href={homeHref} className="sidenav__logo" data-tooltip="위성검색" data-tooltip-pos="right">
                S1
            </Link>
            <nav className="sidenav__nav">
                {items.map((item) => (
                    <Link
                        key={item.path}
                        href={`${base}${item.path}`}
                        className={`sidenav__item${item.match(pathname) ? ' sidenav__item--active' : ''}`}
                        data-tooltip={item.label}
                        data-tooltip-pos="right"
                        aria-label={item.label}
                    >
                        <Icon name={item.icon} size={18} />
                    </Link>
                ))}
            </nav>
            <div className="sidenav__footer">
                <NotificationsButton className="sidenav__icon-btn" />
                {role === 'user' ? <CartButton className="sidenav__icon-btn" /> : null}
                <button
                    type="button"
                    className="sidenav__icon-btn"
                    onClick={toggleTheme}
                    data-tooltip={theme === 'dark' ? '라이트' : '다크'}
                    data-tooltip-pos="right"
                    aria-label="테마 전환"
                >
                    <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
                </button>
                <UserAvatarMenu role={role} base={base} />
            </div>
        </aside>
    );
}

/** 사용자 아바타 — 클릭 시 역할 전환 popover 를 연다. */
function UserAvatarMenu({ role, base }: { role: Role; base: string }) {
    const router = useRouter();
    const ref = useRef<HTMLButtonElement | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
    const [pwOpen, setPwOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        const onDocClick = (e: MouseEvent) => {
            const t = e.target as Node;
            if (ref.current && ref.current.contains(t)) return;
            if (popoverRef.current && popoverRef.current.contains(t)) return;
            setOpen(false);
        };
        const reflow = () => {
            if (!ref.current) return;
            const r = ref.current.getBoundingClientRect();
            const POP_H = popoverRef.current?.offsetHeight ?? 140;
            const margin = 8;
            // 사이드바가 하단에 있으니 기본은 위로 띄우고, 위쪽 공간이 부족하면 아래로.
            let top = r.top - POP_H - margin;
            if (top < margin) top = Math.min(r.bottom + margin, window.innerHeight - POP_H - margin);
            top = Math.max(margin, top);
            const left = r.right + 8;
            setCoords({ top, left });
        };
        reflow();
        // popover가 그려진 뒤 정확한 높이로 한 번 더 보정
        const raf = requestAnimationFrame(reflow);
        window.addEventListener('keydown', onKey);
        window.addEventListener('mousedown', onDocClick, true);
        window.addEventListener('scroll', reflow, true);
        window.addEventListener('resize', reflow);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('mousedown', onDocClick, true);
            window.removeEventListener('scroll', reflow, true);
            window.removeEventListener('resize', reflow);
        };
    }, [open]);

    const switchTo = (next: Role) => {
        setOpen(false);
        if (next === role) return;
        router.push(`${base}${next === 'admin' ? '/admin/dashboard' : '/user/search'}`);
    };

    const openChangePassword = () => {
        setOpen(false);
        setPwOpen(true);
    };

    const logout = () => {
        setOpen(false);
        // 데모: 실제 토큰/세션 무효화 대신 로그인 화면으로 이동. 백엔드 연결 후
        // POST /api/v1/auth/logout 호출 + 쿠키 제거로 교체한다.
        router.push('/login');
    };

    return (
        <>
            <button
                ref={ref}
                type="button"
                className="sidenav__avatar"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="사용자 메뉴"
                data-tooltip={open ? undefined : '김연구원'}
                data-tooltip-pos="right"
                data-open={open}
                data-testid="sidenav-avatar"
            >
                KY
            </button>
            {open && coords && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          ref={popoverRef}
                          role="menu"
                          aria-label="사용자 메뉴"
                          data-testid="sidenav-avatar-menu"
                          style={{
                              position: 'fixed',
                              top: coords.top,
                              left: coords.left,
                              zIndex: 9999,
                              minWidth: 220,
                              padding: '10px 12px',
                              background: 'var(--bg-2)',
                              border: '1px solid var(--border-default)',
                              borderRadius: 8,
                              boxShadow: 'var(--shadow-md)',
                              color: 'var(--text-primary)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                          }}
                      >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>김연구원</span>
                              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                  woo.changuk@lumir.space
                              </span>
                          </div>
                          <div
                              style={{
                                  borderTop: '1px solid var(--border-subtle)',
                                  paddingTop: 8,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 4,
                              }}
                          >
                              <span
                                  style={{
                                      fontSize: 10.5,
                                      color: 'var(--text-tertiary)',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.04em',
                                  }}
                              >
                                  역할
                              </span>
                              <div className="role-switcher" role="radiogroup" aria-label="역할 전환">
                                  {(
                                      [
                                          ['user', 'User'],
                                          ['admin', 'Admin'],
                                      ] as const
                                  ).map(([k, label]) => {
                                      const active = role === k;
                                      return (
                                          <button
                                              key={k}
                                              type="button"
                                              role="radio"
                                              aria-checked={active}
                                              onClick={() => switchTo(k)}
                                              className="role-switcher__btn"
                                              data-active={active}
                                          >
                                              {label}
                                          </button>
                                      );
                                  })}
                              </div>
                          </div>
                          <div
                              style={{
                                  borderTop: '1px solid var(--border-subtle)',
                                  paddingTop: 8,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 2,
                              }}
                          >
                              <button
                                  type="button"
                                  role="menuitem"
                                  className="avatar-menu__item"
                                  onClick={openChangePassword}
                                  data-testid="sidenav-change-password"
                              >
                                  <Icon name="shield" size={14} />
                                  <span>비밀번호 변경</span>
                              </button>
                              <button
                                  type="button"
                                  role="menuitem"
                                  className="avatar-menu__item avatar-menu__item--danger"
                                  onClick={logout}
                                  data-testid="sidenav-logout"
                              >
                                  <Icon name="logout" size={14} />
                                  <span>로그아웃</span>
                              </button>
                          </div>
                      </div>,
                      document.body,
                  )
                : null}
            {pwOpen ? <ChangePasswordModal onClose={() => setPwOpen(false)} /> : null}
        </>
    );
}

/** 비밀번호 변경 모달. 현재/새/확인 3필드 검증 후 mock 저장. */
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
    const toast = useToast();
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = () => {
        if (!current || !next || !confirm) {
            toast('모든 항목을 입력하세요', { tone: 'warning' });
            return;
        }
        if (next.length < 8) {
            toast('새 비밀번호는 8자 이상이어야 합니다', { tone: 'warning' });
            return;
        }
        if (next === current) {
            toast('새 비밀번호가 현재 비밀번호와 같습니다', { tone: 'warning' });
            return;
        }
        if (next !== confirm) {
            toast('새 비밀번호가 일치하지 않습니다', { tone: 'warning' });
            return;
        }
        setSaving(true);
        // Mock: 백엔드 연결 후 POST /api/v1/auth/change-password 로 교체.
        setTimeout(() => {
            setSaving(false);
            toast('비밀번호가 변경되었습니다', { tone: 'success' });
            onClose();
        }, 600);
    };

    return (
        <Modal
            title="비밀번호 변경"
            sub="안전을 위해 8자 이상의 새 비밀번호를 사용하세요"
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn" onClick={onClose} disabled={saving}>
                        취소
                    </button>
                    <button type="button" className="btn btn--primary" onClick={submit} disabled={saving}>
                        {saving ? '변경 중…' : '변경하기'}
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
                    <label className="field-label">현재 비밀번호</label>
                    <input
                        className="input"
                        type="password"
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                        autoFocus
                        autoComplete="current-password"
                    />
                </div>
                <div>
                    <label className="field-label">새 비밀번호</label>
                    <input
                        className="input"
                        type="password"
                        placeholder="8자 이상"
                        value={next}
                        onChange={(e) => setNext(e.target.value)}
                        autoComplete="new-password"
                    />
                </div>
                <div>
                    <label className="field-label">새 비밀번호 확인</label>
                    <input
                        className="input"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        autoComplete="new-password"
                    />
                </div>
                <button type="submit" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}
