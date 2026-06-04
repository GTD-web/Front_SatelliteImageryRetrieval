'use client';

import { Suspense } from 'react';

import { HifiPrefsProvider, ToastProvider } from '@/_ui/hifi';

import { AuthHeroPane } from '../_hero';
import { SetPasswordForm } from '../_set-password-form';

/**
 * 초기 비밀번호 설정 화면.
 *
 * 가입 승인 메일의 `/set-password?token=...&email=...` 링크로 진입한다. 좌측 히어로 + 우측 폼
 * 구성은 로그인/회원가입(`AuthView`)과 동일한 셸을 재사용한다. `useSearchParams`(SetPasswordForm)
 * 때문에 `Suspense` 경계가 필요하다.
 */
export default function SetPasswordPage() {
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
                        <Suspense fallback={null}>
                            <SetPasswordForm />
                        </Suspense>
                    </div>
                </div>
            </ToastProvider>
        </HifiPrefsProvider>
    );
}
