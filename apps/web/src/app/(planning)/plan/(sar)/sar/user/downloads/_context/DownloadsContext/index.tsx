'use client';

/**
 * 내 다운로드 통합 Context — queries + commands + UI 상태 조립
 *
 * - Service 주입 패턴으로 Plan(Mock) / Current(실제 API) 환경 분기
 * - 서버 데이터(jobs)는 useState 로 들지 않고 queries(SWR) 결과를 그대로 전달
 * - kind(종류 필터) 등 순수 UI 상태만 useState 로 보관
 * - NAS 스테이징 진행/대기 충원은 command 를 interval 로 주기 호출하여 재현한다.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { IDownloadsService } from '../../_services/downloads.service.interface';
import type { DownloadsUI } from '../../_mocks/downloads.ui-interface';
import { useJobsQuery } from './queries/use-jobs-query';
import { useJobsCommands } from './commands/use-jobs-commands';

/** 종류 필터 ('all' + 산출물 종류) */
export type KindFilter = 'all' | DownloadsUI.ProductKind;

interface DownloadsContextValue {
    // 데이터 (SWR)
    jobs: DownloadsUI.Job[];
    로딩중: boolean;
    오류: unknown;

    // UI 상태
    kind: KindFilter;
    setKind: (k: KindFilter) => void;

    // commands
    다운로드를_재시도한다: (id: string) => Promise<DownloadsUI.ServiceResponse>;
    NAS에서_다운로드한다: (id: string) => Promise<DownloadsUI.ServiceResponse>;
}

const DownloadsContext = createContext<DownloadsContextValue | undefined>(undefined);

export function DownloadsProvider({
    children,
    uiService,
}: {
    children: ReactNode;
    uiService: IDownloadsService;
}) {
    const [kind, setKind] = useState<KindFilter>('all');

    const { jobs, isLoading, error, jobsKey } = useJobsQuery({ service: uiService });

    const {
        다운로드를_재시도한다,
        NAS에서_다운로드한다,
        스테이징_진행을_시뮬레이션한다,
        대기_잡을_시작한다,
    } = useJobsCommands({ service: uiService, jobsKey });

    // NAS 스테이징 진행 시뮬레이션 — 1.2초마다 한 틱 전진
    useEffect(() => {
        const t = setInterval(() => {
            void 스테이징_진행을_시뮬레이션한다();
        }, 1200);
        return () => clearInterval(t);
    }, [스테이징_진행을_시뮬레이션한다]);

    // 슬롯이 비면(=잡 1개가 done/failed로 빠질 때) 대기 잡을 다시 채운다
    const runningCount = jobs.filter((j) => j.status === 'running').length;
    useEffect(() => {
        void 대기_잡을_시작한다();
    }, [runningCount, 대기_잡을_시작한다]);

    const value = useMemo<DownloadsContextValue>(
        () => ({
            jobs,
            로딩중: isLoading,
            오류: error,
            kind,
            setKind,
            다운로드를_재시도한다,
            NAS에서_다운로드한다,
        }),
        [jobs, isLoading, error, kind, 다운로드를_재시도한다, NAS에서_다운로드한다],
    );

    return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

export function useDownloadsContext(): DownloadsContextValue {
    const ctx = useContext(DownloadsContext);
    if (ctx == null) {
        throw new Error('useDownloadsContext는 DownloadsProvider 내부에서만 사용할 수 있습니다.');
    }
    return ctx;
}
