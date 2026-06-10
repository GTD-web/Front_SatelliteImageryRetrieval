'use client';

/**
 * 실패 다운로드 재시도/무시 mutations (단건 / 일괄)
 *
 * - 각 mutation 성공 후 listKey 를 mutate 하여 목록 SWR 을 재검증한다.
 * - 토스트/확인 다이얼로그 피드백은 여기서 처리한다(UI 컴포넌트는 Context 함수만 호출).
 * - 일괄 처리는 단건 서비스 메서드를 반복 호출한다.
 */
import { useCallback } from 'react';
import { mutate } from 'swr';

import { useConfirm, useToast } from '@/_ui/hifi';
import type { IFailedDownloadsService } from '../../../_services/failed-downloads.service.interface';

interface Params {
    service: IFailedDownloadsService;
    listKey: readonly unknown[];
}

export function useFailedJobsCommands({ service, listKey }: Params) {
    const toast = useToast();
    const confirm = useConfirm();

    const 다운로드를_재시도한다 = useCallback(
        async (id: string) => {
            const res = await service.다운로드를_재시도한다(id);
            await mutate(listKey);
            if (res.success) {
                toast(`${id} 재시도 큐에 추가됨`, { tone: 'success' });
            } else {
                toast(res.message, { tone: 'danger' });
            }
            return res;
        },
        [service, listKey, toast],
    );

    const 다운로드를_무시한다 = useCallback(
        async (id: string) => {
            const res = await service.다운로드를_무시한다(id);
            await mutate(listKey);
            if (!res.success) {
                toast(res.message, { tone: 'danger' });
            }
            return res;
        },
        [service, listKey, toast],
    );

    const 선택_재시도한다 = useCallback(
        async (ids: string[]) => {
            if (ids.length === 0) return;
            const ok = await confirm({
                title: `${ids.length}건 재시도`,
                body: '선택된 실패 잡을 다운로드 큐에 다시 넣습니다.',
                confirmLabel: '재시도',
            });
            if (!ok) return;
            await Promise.all(ids.map((id) => service.다운로드를_재시도한다(id)));
            await mutate(listKey);
            toast(`${ids.length}건 재시도 큐에 추가됨`, { tone: 'success' });
        },
        [service, listKey, toast, confirm],
    );

    const 선택_무시한다 = useCallback(
        async (ids: string[]) => {
            if (ids.length === 0) return;
            const ok = await confirm({
                title: `${ids.length}건 무시`,
                body: '선택된 실패 잡을 목록에서 제거합니다. (감사 로그에는 남습니다)',
                confirmLabel: '무시',
                danger: true,
            });
            if (!ok) return;
            await Promise.all(ids.map((id) => service.다운로드를_무시한다(id)));
            await mutate(listKey);
            toast(`${ids.length}건 처리됨`);
        },
        [service, listKey, toast, confirm],
    );

    return {
        다운로드를_재시도한다,
        다운로드를_무시한다,
        선택_재시도한다,
        선택_무시한다,
    };
}
