'use client';

/**
 * 사용자 승인/거절/초대/수정 mutations
 *
 * - 각 mutation 성공 후 listKey 를 mutate 하여 목록 SWR 을 재검증한다.
 * - 토스트/확인 다이얼로그 피드백은 여기서 처리한다(UI 컴포넌트는 Context 함수만 호출).
 * - 승인/거절 확인 다이얼로그를 command 안으로 옮긴다.
 */
import { useCallback } from 'react';
import { mutate } from 'swr';

import { useConfirm, useToast } from '@/_ui/hifi';
import type { IUsersService } from '../../../_services/users.service.interface';
import type { UsersUI } from '../../../_mocks/users.ui-interface';

interface Params {
    service: IUsersService;
    listKey: readonly unknown[];
}

export function useUsersCommands({ service, listKey }: Params) {
    const toast = useToast();
    const confirm = useConfirm();

    const 가입을_승인한다 = useCallback(
        async (email: string) => {
            const ok = await confirm({
                title: '가입 승인',
                body: `${email} 사용자의 가입을 승인하시겠습니까?`,
                sub: '승인하면 사용자 권한으로 활성화되고, 사용자에게 초기 비밀번호 설정 메일이 발송됩니다.',
                confirmLabel: '승인',
            });
            if (!ok) return false;
            const res = await service.가입을_승인한다(email);
            await mutate(listKey);
            if (res.success) {
                toast(`${email} 승인됨 · 초기 비밀번호 설정 메일을 발송했습니다`, { tone: 'success' });
            } else {
                toast(res.message, { tone: 'danger' });
            }
            return res.success;
        },
        [service, listKey, toast, confirm],
    );

    const 가입을_거절한다 = useCallback(
        async (email: string) => {
            const ok = await confirm({
                title: '가입 거절',
                body: `${email} 사용자의 가입을 거절하시겠습니까?`,
                sub: '거절하면 가입 요청이 목록에서 제거됩니다.',
                confirmLabel: '거절',
                danger: true,
            });
            if (!ok) return false;
            const res = await service.가입을_거절한다(email);
            await mutate(listKey);
            if (res.success) {
                toast(`${email} 거절됨`);
            } else {
                toast(res.message, { tone: 'danger' });
            }
            return res.success;
        },
        [service, listKey, toast, confirm],
    );

    const 사용자를_초대한다 = useCallback(
        async (input: UsersUI.InviteUserInput) => {
            const res = await service.사용자를_초대한다(input);
            await mutate(listKey);
            if (res.success) {
                toast(`${input.email} 으로 초대 메일을 전송했습니다`, {
                    tone: 'success',
                    title: '초대 발송',
                });
            } else {
                toast(res.message, { tone: 'danger' });
            }
            return res.success;
        },
        [service, listKey, toast],
    );

    const 사용자를_수정한다 = useCallback(
        async (email: string, patch: UsersUI.UpdateUserInput) => {
            const res = await service.사용자를_수정한다(email, patch);
            await mutate(listKey);
            if (res.success) {
                toast(`${email} 정보가 저장되었습니다`, { tone: 'success' });
            } else {
                toast(res.message, { tone: 'danger' });
            }
            return res.success;
        },
        [service, listKey, toast],
    );

    return {
        가입을_승인한다,
        가입을_거절한다,
        사용자를_초대한다,
        사용자를_수정한다,
    };
}
