'use client';

/**
 * 실패 다운로드 통합 Context — queries + commands + UI 상태 조립
 *
 * - Service 주입 패턴으로 Plan(Mock) / Current(실제 API) 환경 분기
 * - 서버 데이터(jobs)는 useState 로 들지 않고 queries(SWR) 결과를 그대로 전달
 * - filter/q/sel(선택) 등 순수 UI 상태만 useState 로 보관
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { IFailedDownloadsService } from '../../_services/failed-downloads.service.interface';
import type { FailedDownloadsUI } from '../../_mocks/failed-downloads.ui-interface';
import { useFailedJobsQuery } from './queries/use-failed-jobs-query';
import { useFailedJobsCommands } from './commands/use-failed-jobs-commands';

/** 사유 필터 ('전체' + 실패 사유) */
export type Filter = '전체' | FailedDownloadsUI.FailureKind;

interface FailedDownloadsContextValue {
    // 데이터 (SWR)
    jobs: FailedDownloadsUI.FailedJob[];
    로딩중: boolean;
    오류: unknown;

    // UI 상태
    filter: Filter;
    setFilter: (f: Filter) => void;
    q: string;
    setQ: (q: string) => void;
    sel: Set<string>;
    /** 주어진 표시 목록 기준으로 전체 선택/해제 토글 */
    toggleAll: (ids: string[]) => void;
    toggleOne: (id: string) => void;

    // commands
    다운로드를_재시도한다: (id: string) => Promise<FailedDownloadsUI.ServiceResponse>;
    선택_재시도한다: (ids: string[]) => Promise<void>;
    선택_무시한다: (ids: string[]) => Promise<void>;
}

const FailedDownloadsContext = createContext<FailedDownloadsContextValue | undefined>(undefined);

export function FailedDownloadsProvider({
    children,
    uiService,
}: {
    children: ReactNode;
    uiService: IFailedDownloadsService;
}) {
    const [filter, setFilter] = useState<Filter>('전체');
    const [q, setQ] = useState('');
    const [sel, setSel] = useState<Set<string>>(new Set());

    const listParams = useMemo<FailedDownloadsUI.FailedJobListParams>(() => ({}), []);

    const { jobs, isLoading, error, listKey } = useFailedJobsQuery({ service: uiService, listParams });

    const { 다운로드를_재시도한다, 선택_재시도한다, 선택_무시한다 } = useFailedJobsCommands({
        service: uiService,
        listKey,
    });

    const toggleAll = (ids: string[]) => {
        const allChecked = ids.length > 0 && ids.every((id) => sel.has(id));
        setSel(allChecked ? new Set() : new Set(ids));
    };

    const toggleOne = (id: string) =>
        setSel((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });

    const value = useMemo<FailedDownloadsContextValue>(
        () => ({
            jobs,
            로딩중: isLoading,
            오류: error,
            filter,
            setFilter,
            q,
            setQ,
            sel,
            toggleAll,
            toggleOne,
            다운로드를_재시도한다,
            선택_재시도한다,
            선택_무시한다,
        }),
        // toggleAll/toggleOne 은 sel 에 의존하므로 sel 변경 시 함께 재생성된다.
        [jobs, isLoading, error, filter, q, sel, 다운로드를_재시도한다, 선택_재시도한다, 선택_무시한다],
    );

    return <FailedDownloadsContext.Provider value={value}>{children}</FailedDownloadsContext.Provider>;
}

export function useFailedDownloadsContext(): FailedDownloadsContextValue {
    const ctx = useContext(FailedDownloadsContext);
    if (ctx == null) {
        throw new Error('useFailedDownloadsContext는 FailedDownloadsProvider 내부에서만 사용할 수 있습니다.');
    }
    return ctx;
}
