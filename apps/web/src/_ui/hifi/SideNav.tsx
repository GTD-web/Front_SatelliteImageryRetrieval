'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CartButton } from './CartOverlay';
import { Icon, type IconName } from './Icon';
import { useHifiPrefs } from './HifiPrefsProvider';
import { NotificationsButton } from './NotificationsOverlay';

type Role = 'user' | 'admin';

interface NavItem {
    label: string;
    href: string;
    icon: IconName;
    match: (path: string) => boolean;
}

const base = '/plan/sar';

const USER_ITEMS: NavItem[] = [
    { label: '검색', href: `${base}/user/search`, icon: 'search', match: (p) => p.includes('/user/search') },
    {
        label: '다운로드',
        href: `${base}/user/downloads`,
        icon: 'download',
        match: (p) => p.includes('/user/downloads'),
    },
    {
        label: '분석 요청',
        href: `${base}/user/insar/request`,
        icon: 'activity',
        match: (p) => p.includes('/user/insar/request'),
    },
    {
        label: '분석 결과',
        href: `${base}/user/insar/results`,
        icon: 'layers',
        match: (p) => p.includes('/user/insar/results'),
    },
    {
        label: 'AOI 관리',
        href: `${base}/user/aois`,
        icon: 'folder',
        match: (p) => p.includes('/user/aois'),
    },
];

const ADMIN_ITEMS: NavItem[] = [
    {
        label: '대시보드',
        href: `${base}/admin/dashboard`,
        icon: 'chart',
        match: (p) => p.includes('/admin/dashboard'),
    },
    { label: '검색', href: `${base}/admin/search`, icon: 'search', match: (p) => p.includes('/admin/search') },
    { label: '사용자', href: `${base}/admin/users`, icon: 'users', match: (p) => p.includes('/admin/users') },
    {
        label: '크롤 AOI',
        href: `${base}/admin/crawl-targets`,
        icon: 'satellite',
        match: (p) => p.includes('/admin/crawl-targets'),
    },
    { label: 'Sync', href: `${base}/admin/sync-monitor`, icon: 'refresh', match: (p) => p.includes('/admin/sync-monitor') },
    { label: '감사', href: `${base}/admin/audit-logs`, icon: 'clock', match: (p) => p.includes('/admin/audit-logs') },
];

export function SideNav() {
    const pathname = usePathname() ?? '';
    const { theme, toggleTheme } = useHifiPrefs();

    const role: Role = pathname.includes('/admin/') ? 'admin' : 'user';
    const items = role === 'admin' ? ADMIN_ITEMS : USER_ITEMS;
    const homeHref = role === 'admin' ? `${base}/admin/dashboard` : `${base}/user/search`;

    return (
        <aside className="sidenav">
            <Link href={homeHref} className="sidenav__logo" data-tooltip="위성검색" data-tooltip-pos="right">
                S1
            </Link>
            <nav className="sidenav__nav">
                {items.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
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
                <UserAvatarMenu role={role} />
            </div>
        </aside>
    );
}

/** 사용자 아바타 — 클릭 시 역할 전환 popover 를 연다. */
function UserAvatarMenu({ role }: { role: Role }) {
    const router = useRouter();
    const ref = useRef<HTMLButtonElement | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

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
        router.push(next === 'admin' ? `${base}/admin/dashboard` : `${base}/user/search`);
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
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}
