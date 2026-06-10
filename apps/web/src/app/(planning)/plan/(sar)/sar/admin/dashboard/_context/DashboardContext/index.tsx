'use client';

/**
 * 관리자 대시보드 통합 Context — query + UI 상태 조립
 *
 * - Service 주입 패턴으로 Plan(Mock) / Current(실제 API) 환경 분기
 * - 서버 데이터(summary)는 useState 로 들지 않고 query(SWR) 결과를 그대로 전달
 * - range/shake/lastUpdated/mounted 등 순수 UI 상태만 useState 로 보관
 * - 대시보드는 읽기 전용이라 commands 레이어가 없다. refresh 는 서버 변경이 아니라
 *   shake 시드만 올려 모킹 데이터를 다시 흔드는 순수 UI 액션이다.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useToast } from '@/_ui/hifi';
import type { IDashboardService } from '../../_services/dashboard.service.interface';
import type { DashboardUI } from '../../_mocks/dashboard.ui-interface';
import { RANGE_LABEL } from '../../_constants/dashboard-labels';
import { useDashboardSummaryQuery } from './queries/use-dashboard-summary-query';

interface DashboardContextValue {
    // 데이터 (SWR)
    summary: DashboardUI.DashboardSummary;
    로딩중: boolean;
    오류: unknown;

    // UI 상태
    range: DashboardUI.Range;
    setRange: (r: DashboardUI.Range) => void;
    lastUpdated: Date;
    /** hydration mismatch 방지용 mount 마커 */
    mounted: boolean;

    // 순수 UI 액션 (서버 변경 아님)
    refresh: () => void;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function DashboardProvider({ children, uiService }: { children: ReactNode; uiService: IDashboardService }) {
    const toast = useToast();
    const [range, setRange] = useState<DashboardUI.Range>('24h');
    /** 새로고침 누적값 — KPI/sparkline/throughput 차트가 살짝 흔들리도록 시드로 사용. */
    const [shake, setShake] = useState(0);
    const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());

    // 클라이언트에서만 최초 시각이 갱신되므로 hydration mismatch 방지용 mount 마커
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const summaryParams = useMemo<DashboardUI.DashboardSummaryParams>(() => ({ range, shake }), [range, shake]);

    const { summary, isLoading, error } = useDashboardSummaryQuery({ service: uiService, summaryParams });

    const refresh = () => {
        setShake((s) => s + 1);
        setLastUpdated(new Date());
        toast(`${RANGE_LABEL[range]} 데이터 새로고침됨`, { tone: 'success' });
    };

    const value = useMemo<DashboardContextValue>(
        () => ({
            summary,
            로딩중: isLoading,
            오류: error,
            range,
            setRange,
            lastUpdated,
            mounted,
            refresh,
        }),
        // refresh 는 range 에 의존하므로 range 변경 시 함께 재생성된다.
        [summary, isLoading, error, range, lastUpdated, mounted],
    );

    return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext(): DashboardContextValue {
    const ctx = useContext(DashboardContext);
    if (ctx == null) {
        throw new Error('useDashboardContext는 DashboardProvider 내부에서만 사용할 수 있습니다.');
    }
    return ctx;
}
