'use client';

/**
 * 대시보드 요약 SWR 조회
 *
 * - Context 는 서버 데이터를 useState 로 들지 않고, 이 훅의 SWR 결과를 그대로 전달한다.
 * - range/shake 같은 UI 상태는 Context 가 보관하고, 여기서는 그 파라미터로 요약만 가져온다.
 */
import { useMemo } from 'react';
import useSWR from 'swr';

import type { IDashboardService } from '../../../_services/dashboard.service.interface';
import type { DashboardUI } from '../../../_mocks/dashboard.ui-interface';
import { createDashboardSummaryKey } from '../utils/swr-keys';

interface Params {
    service: IDashboardService;
    summaryParams: DashboardUI.DashboardSummaryParams;
}

/** range/shake 변동 시에도 이전 데이터를 유지해 차트가 깜빡이지 않도록 한다. */
const EMPTY_SUMMARY: DashboardUI.DashboardSummary = {
    kpis: [],
    throughput: { bars: [], linePoints: [], labels: [] },
    quickActions: [],
    events: [],
    nas: { rows: [], usedTb: 0, capacityTb: 60 },
};

export function useDashboardSummaryQuery({ service, summaryParams }: Params) {
    const summaryKey = useMemo(() => createDashboardSummaryKey(summaryParams), [summaryParams]);

    const { data, error, isLoading } = useSWR(
        summaryKey,
        () => service.대시보드_요약을_조회한다(summaryParams),
        { revalidateOnFocus: false, dedupingInterval: 3000, keepPreviousData: true },
    );

    const summary: DashboardUI.DashboardSummary = useMemo(
        () => (data?.success && data.data ? data.data : EMPTY_SUMMARY),
        [data],
    );

    return {
        summary,
        isLoading,
        error,
        summaryKey,
    };
}
