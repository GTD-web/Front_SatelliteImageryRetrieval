'use client';

/**
 * 동기화 이력 SWR 조회
 */
import { useMemo } from 'react';
import useSWR from 'swr';

import type { ISyncMonitorService } from '../../../_services/sync-monitor.service.interface';
import type { SyncMonitorUI } from '../../../_mocks/sync-monitor.ui-interface';
import { createSyncHistoryKey } from '../utils/swr-keys';

interface Params {
    service: ISyncMonitorService;
}

export function useSyncHistoryQuery({ service }: Params) {
    const historyKey = useMemo(() => createSyncHistoryKey(), []);

    const { data, error, isLoading } = useSWR(
        historyKey,
        () => service.동기화_이력을_조회한다(),
        { revalidateOnFocus: false, dedupingInterval: 3000 },
    );

    const runs: SyncMonitorUI.Run[] = useMemo(
        () => (data?.success && data.data ? data.data.runs : []),
        [data],
    );

    return {
        runs,
        isLoading,
        error,
        /** commands 가 mutate 호출 시 사용 */
        historyKey,
    };
}
