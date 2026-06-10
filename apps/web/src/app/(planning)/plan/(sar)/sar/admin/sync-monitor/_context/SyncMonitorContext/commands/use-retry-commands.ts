'use client';

/**
 * 동기화 재시도 mutations (단건 / 전체)
 *
 * - 재시도 성공 후 historyKey 를 mutate 하여 이력 SWR 을 재검증한다.
 */
import { useCallback } from 'react';
import { mutate } from 'swr';

import { useToast } from '@/_ui/hifi';
import type { ISyncMonitorService } from '../../../_services/sync-monitor.service.interface';
import type { SyncMonitorUI } from '../../../_mocks/sync-monitor.ui-interface';

interface Params {
    service: ISyncMonitorService;
    historyKey: readonly unknown[];
    /** 전체 재시도 대상 판별을 위한 현재 이력 */
    runs: SyncMonitorUI.Run[];
}

export function useRetryCommands({ service, historyKey, runs }: Params) {
    const toast = useToast();

    const AOI를_재시도한다 = useCallback(
        async (aoi: string) => {
            toast(`${aoi} 재시도 중…`, { tone: 'success' });
            const res = await service.AOI를_재시도한다(aoi);
            await mutate(historyKey);
            if (res.success) {
                toast(`${aoi} 동기화 완료`, { tone: 'success' });
            } else {
                toast(res.message, { tone: 'danger' });
            }
            return res;
        },
        [service, historyKey, toast],
    );

    const 전체_재시도한다 = useCallback(async () => {
        const failed = runs.filter((r) => r.status !== 'success');
        if (failed.length === 0) {
            toast('실패한 작업이 없습니다');
            return;
        }
        await Promise.all(failed.map((r) => AOI를_재시도한다(r.aoi)));
    }, [runs, toast, AOI를_재시도한다]);

    return {
        AOI를_재시도한다,
        전체_재시도한다,
    };
}
