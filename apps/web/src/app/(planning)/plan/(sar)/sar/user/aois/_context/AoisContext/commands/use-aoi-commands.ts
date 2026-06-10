'use client';

/**
 * AOI 등록/수정/삭제 mutations
 *
 * 공유 `SavedAoisContext`(localStorage)를 통해 변경하므로, search / insar-request 등
 * 다른 페이지의 AOI 라이브러리와 즉시 동기화된다. 토스트/확인(confirm) 피드백은 여기서 처리한다.
 */
import { useCallback } from 'react';

import { useConfirm, useToast } from '@/_ui/hifi';
import { useSavedAois } from '@/_shared/contexts/SavedAoisContext';
import type { AoisUI } from '../../../_mocks/aois.ui-interface';

interface Params {
    /** 등록된 AOI 를 선택 상태로 만들기 위한 콜백 */
    onAoiCreated?: (id: string) => void;
    /** 삭제된 AOI 가 현재 선택 항목이면 해제하기 위한 콜백 */
    onAoiRemoved?: (id: string) => void;
}

export function useAoiCommands({ onAoiCreated, onAoiRemoved }: Params) {
    const toast = useToast();
    const confirm = useConfirm();
    const { save, rename, remove } = useSavedAois();

    const AOI를_등록한다 = useCallback(
        (input: AoisUI.CreateAoiInput) => {
            const created = save(input);
            onAoiCreated?.(created.id);
            toast(`"${input.name}" 등록됨`, { tone: 'success' });
            return created;
        },
        [save, toast, onAoiCreated],
    );

    const AOI를_수정한다 = useCallback(
        (input: AoisUI.RenameAoiInput) => {
            rename(input.id, input.name, input.description);
            toast(`"${input.name}" 으로 변경됨`, { tone: 'success' });
        },
        [rename, toast],
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
            remove(aoi.id);
            onAoiRemoved?.(aoi.id);
            toast(`"${aoi.name}" 삭제됨`);
        },
        [remove, confirm, toast, onAoiRemoved],
    );

    return {
        AOI를_등록한다,
        AOI를_수정한다,
        AOI를_삭제한다,
    };
}
