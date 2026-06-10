'use client';

/**
 * AOI 등록/수정/삭제 mutations
 *
 * - 각 mutation 성공 후 listKey 를 mutate 하여 목록 SWR 을 재검증한다.
 * - 토스트/확인(confirm) 피드백은 여기서 처리한다(UI 컴포넌트는 Context 함수만 호출).
 */
import { useCallback } from 'react';
import { mutate } from 'swr';

import { useConfirm, useToast } from '@/_ui/hifi';
import type { IAoisService } from '../../../_services/aois.service.interface';
import type { AoisUI } from '../../../_mocks/aois.ui-interface';

interface Params {
    service: IAoisService;
    listKey: readonly unknown[];
    /** 등록된 AOI 를 선택 상태로 만들기 위한 콜백 */
    onAoiCreated?: (id: string) => void;
    /** 삭제된 AOI 가 현재 선택 항목이면 해제하기 위한 콜백 */
    onAoiRemoved?: (id: string) => void;
}

export function useAoiCommands({ service, listKey, onAoiCreated, onAoiRemoved }: Params) {
    const toast = useToast();
    const confirm = useConfirm();

    const AOI를_등록한다 = useCallback(
        async (input: AoisUI.CreateAoiInput) => {
            const res = await service.AOI를_등록한다(input);
            await mutate(listKey);
            if (res.success && res.data) {
                onAoiCreated?.(res.data.id);
                toast(`"${input.name}" 등록됨`, { tone: 'success' });
            } else if (!res.success) {
                toast(res.message, { tone: 'danger' });
            }
            return res;
        },
        [service, listKey, toast, onAoiCreated],
    );

    const AOI를_수정한다 = useCallback(
        async (input: AoisUI.RenameAoiInput) => {
            const res = await service.AOI를_수정한다(input);
            await mutate(listKey);
            if (res.success) {
                toast(`"${input.name}" 으로 변경됨`, { tone: 'success' });
            } else {
                toast(res.message, { tone: 'danger' });
            }
            return res;
        },
        [service, listKey, toast],
    );

    const AOI를_삭제한다 = useCallback(
        async (aoi: AoisUI.Aoi) => {
            const ok = await confirm({
                title: 'AOI 삭제',
                body: `"${aoi.name}" 을(를) 삭제할까요?`,
                confirmLabel: '삭제',
                danger: true,
            });
            if (!ok) return;
            const res = await service.AOI를_삭제한다(aoi.id);
            await mutate(listKey);
            if (res.success) {
                onAoiRemoved?.(aoi.id);
                toast(`"${aoi.name}" 삭제됨`);
            } else {
                toast(res.message, { tone: 'danger' });
            }
            return res;
        },
        [service, listKey, toast, confirm, onAoiRemoved],
    );

    return {
        AOI를_등록한다,
        AOI를_수정한다,
        AOI를_삭제한다,
    };
}
