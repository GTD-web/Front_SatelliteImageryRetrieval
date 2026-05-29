'use client';

import { useState } from 'react';

import { HifiPrefsProvider, ToastProvider } from '@/_ui/hifi';

import { AuthHeroPane } from './_hero';
import { LoginForm } from './_login-form';
import { SignupForm } from './_signup-form';

export type AuthMode = 'login' | 'signup';

/**
 * 로그인/회원가입 공통 셸.
 *
 * 좌측 히어로(지도 `MapCanvas`)는 한 번만 마운트하고, 우측 폼만 `mode` state로 교체한다.
 * 로그인↔회원가입 전환을 라우트 이동이 아닌 state 토글로 처리하므로 `AuthHeroPane`이
 * 언마운트/재마운트되지 않고, OpenLayers 지도가 재초기화(리프레시)되지 않는다.
 * `/login`·`/signup` 두 라우트는 직접 진입·SSR용으로 유지하되 `initialMode`만 다르게 준다.
 */
export function AuthView({ initialMode }: { initialMode: AuthMode }) {
    const [mode, setMode] = useState<AuthMode>(initialMode);

    return (
        <HifiPrefsProvider>
            <ToastProvider>
                <div style={{ height: '100vh', display: 'flex', background: 'var(--bg-0)' }}>
                    <AuthHeroPane />
                    <div
                        style={{
                            flex: '1 1 45%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 32,
                            overflowY: 'auto',
                        }}
                    >
                        {mode === 'login' ? (
                            <LoginForm onSwitchToSignup={() => setMode('signup')} />
                        ) : (
                            <SignupForm onSwitchToLogin={() => setMode('login')} />
                        )}
                    </div>
                </div>
            </ToastProvider>
        </HifiPrefsProvider>
    );
}
