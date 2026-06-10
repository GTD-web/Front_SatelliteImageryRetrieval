import type { ReactNode } from 'react';

import { AppProviders } from '@/_shared/contexts/AppProviders';
import { HifiCartProvider } from '@/_shared/contexts/HifiCartContext';
import { SavedAoisProvider } from '@/_shared/contexts/SavedAoisContext';
import {
    CartOverlayProvider,
    ConfirmProvider,
    HifiPrefsProvider,
    NotificationsOverlayProvider,
    ToastProvider,
} from '@/_ui/hifi';
import { ModeBadge } from '@/_ui/ModeBadge';
import { ThemeToggle } from '@/_ui/ThemeToggle';

/**
 * Current(실제 API) 환경 레이아웃.
 *
 * current 페이지들은 plan 의 Context/UI 를 그대로 재사용하므로, plan layout 과 동일한
 * hifi 프로바이더 스택(Toast/Confirm/Cart/SavedAois/오버레이)을 제공해야 한다.
 * (SideNav 는 `/plan/sar` 경로 고정이라 제외 — current 네비게이션은 별도 과제)
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
                                        <div className="flex h-screen flex-col bg-app text-content">
                                            <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-2">
                                                <h1 className="text-base font-bold">Sentinel 데이터 플랫폼</h1>
                                                <div className="flex items-center gap-3">
                                                    <ThemeToggle />
                                                    <ModeBadge />
                                                    <span className="text-xs text-content-muted">
                                                        로그인 사용자
                                                    </span>
                                                </div>
                                            </header>
                                            <main className="flex-1 overflow-hidden">{children}</main>
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
