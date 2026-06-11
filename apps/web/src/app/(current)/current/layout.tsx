import type { ReactNode } from 'react';

import { AppProviders } from '@/_shared/contexts/AppProviders';
import { HifiCartProvider } from '@/_shared/contexts/HifiCartContext';
import { SavedAoisProvider } from '@/_shared/contexts/SavedAoisContext';
import {
    CartOverlayProvider,
    ConfirmProvider,
    HifiPrefsProvider,
    NotificationsOverlayProvider,
    SideNav,
    ToastProvider,
} from '@/_ui/hifi';
import { ModeBadge } from '@/_ui/ModeBadge';

/**
 * Current(실제 API) 환경 레이아웃.
 *
 * current 페이지들은 plan 의 Context/UI 를 그대로 재사용하므로, plan layout 과 동일한
 * hifi 프로바이더 스택 + SideNav 를 제공한다. SideNav 는 경로 그룹(plan/current)을 감지해
 * current 내에서 네비게이션이 current 경로로 유지된다. 상단 얇은 바의 ModeBadge 로 환경을 표시한다.
 */
export default function CurrentLayout({ children }: { children: ReactNode }) {
    return (
        <AppProviders>
            <HifiPrefsProvider>
                <ToastProvider>
                    <ConfirmProvider>
                        <HifiCartProvider>
                            <SavedAoisProvider>
                                <CartOverlayProvider>
                                    <NotificationsOverlayProvider>
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'row',
                                                height: '100%',
                                                minHeight: 0,
                                            }}
                                        >
                                            <SideNav />
                                            <main
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    minWidth: 0,
                                                    minHeight: 0,
                                                    background: 'var(--bg-1)',
                                                }}
                                            >
                                                <div
                                                    className="row gap-2"
                                                    style={{
                                                        alignItems: 'center',
                                                        justifyContent: 'flex-end',
                                                        padding: '6px 16px',
                                                        borderBottom: '1px solid var(--border-subtle)',
                                                    }}
                                                >
                                                    <span className="faint" style={{ fontSize: 12 }}>
                                                        실제 API 환경
                                                    </span>
                                                    <ModeBadge />
                                                </div>
                                                {children}
                                            </main>
                                        </div>
                                    </NotificationsOverlayProvider>
                                </CartOverlayProvider>
                            </SavedAoisProvider>
                        </HifiCartProvider>
                    </ConfirmProvider>
                </ToastProvider>
            </HifiPrefsProvider>
        </AppProviders>
    );
}
