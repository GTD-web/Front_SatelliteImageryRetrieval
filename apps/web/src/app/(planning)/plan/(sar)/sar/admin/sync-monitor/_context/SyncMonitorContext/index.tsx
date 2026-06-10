'use client';

/**
 * 동기화 모니터 통합 Context — queries + commands 조립
 *
 * - Service 주입 패턴으로 Plan(Mock) / Current(실제 API) 환경 분기
 * - 서버 데이터는 queries(SWR) 결과를 그대로 전달
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { ISyncMonitorService } from '../../_services/sync-monitor.service.interface';
import type { SyncMonitorUI } from '../../_mocks/sync-monitor.ui-interface';
import { useSyncHistoryQuery } from './queries/use-sync-history-query';
import { useRetryCommands } from './commands/use-retry-commands';

interface SyncMonitorContextValue {
    runs: SyncMonitorUI.Run[];
    로딩중: boolean;
    오류: unknown;

    AOI를_재시도한다: (aoi: string) => Promise<SyncMonitorUI.ServiceResponseWithData<SyncMonitorUI.Run>>;
    전체_재시도한다: () => Promise<void>;
}

const SyncMonitorContext = createContext<SyncMonitorContextValue | undefined>(undefined);

export function SyncMonitorProvider({
    children,
    uiService,
}: {
    children: ReactNode;
    uiService: ISyncMonitorService;
}) {
    const { runs, isLoading, error, historyKey } = useSyncHistoryQuery({ service: uiService });

    const { AOI를_재시도한다, 전체_재시도한다 } = useRetryCommands({
        service: uiService,
        historyKey,
        runs,
    });

    const value = useMemo<SyncMonitorContextValue>(
        () => ({
            runs,
            로딩중: isLoading,
            오류: error,
            AOI를_재시도한다,
            전체_재시도한다,
        }),
        [runs, isLoading, error, AOI를_재시도한다, 전체_재시도한다],
    );

    return <SyncMonitorContext.Provider value={value}>{children}</SyncMonitorContext.Provider>;
}

export function useSyncMonitorContext(): SyncMonitorContextValue {
    const ctx = useContext(SyncMonitorContext);
    if (ctx == null) {
        throw new Error('useSyncMonitorContext는 SyncMonitorProvider 내부에서만 사용할 수 있습니다.');
    }
    return ctx;
}
