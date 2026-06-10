'use client';

/**
 * 분석 품질(InSAR QA) 통합 Context — query + commands + UI 상태 조립
 *
 * - Service 주입 패턴으로 Plan(Mock) / Current(실제 API) 환경 분기
 * - 서버 데이터(summary)는 useState 로 들지 않고 query(SWR) 결과를 그대로 전달
 * - selected/typeFilter/glossaryOpen 등 순수 UI 상태만 useState 로 보관
 * - filtered/current 는 summary + UI 상태에서 파생되는 값이라 useMemo 로만 계산한다.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { IAnalysisQaService } from '../../_services/analysis-qa.service.interface';
import type { AnalysisQaUI } from '../../_mocks/analysis-qa.ui-interface';
import { useQaSummaryQuery } from './queries/use-qa-summary-query';
import { useQaCommands } from './commands/use-qa-commands';

interface AnalysisQaContextValue {
    // 데이터 (SWR)
    summary: AnalysisQaUI.QaSummary;
    로딩중: boolean;
    오류: unknown;

    // 파생 (summary + UI 상태)
    /** typeFilter 로 거른 산출물 목록 (테이블 소스) */
    filtered: AnalysisQaUI.ScoredProduct[];
    /** selected 로 고른 현재 산출물 (상세 패널 소스) */
    current: AnalysisQaUI.Detail | null;

    // UI 상태
    selected: string;
    setSelected: (id: string) => void;
    typeFilter: AnalysisQaUI.TypeFilter;
    setTypeFilter: (t: AnalysisQaUI.TypeFilter) => void;
    glossaryOpen: boolean;
    setGlossaryOpen: (open: boolean) => void;

    // commands
    산출물을_재처리한다: (name: string) => Promise<AnalysisQaUI.ServiceResponse>;
    품질지표를_재계산한다: () => Promise<void>;
}

const AnalysisQaContext = createContext<AnalysisQaContextValue | undefined>(undefined);

export function AnalysisQaProvider({
    children,
    uiService,
}: {
    children: ReactNode;
    uiService: IAnalysisQaService;
}) {
    const [selected, setSelected] = useState('pohang-q4');
    const [typeFilter, setTypeFilter] = useState<AnalysisQaUI.TypeFilter>('전체');
    const [glossaryOpen, setGlossaryOpen] = useState(false);

    const { summary, isLoading, error, summaryKey } = useQaSummaryQuery({ service: uiService });

    const { 산출물을_재처리한다, 품질지표를_재계산한다 } = useQaCommands({
        service: uiService,
        summaryKey,
    });

    const filtered = useMemo(
        () => summary.scored.filter((s) => typeFilter === '전체' || s.product.type === typeFilter),
        [summary.scored, typeFilter],
    );

    const current = useMemo<AnalysisQaUI.Detail | null>(
        () => summary.scored.find((s) => s.product.id === selected) ?? summary.scored[0] ?? null,
        [summary.scored, selected],
    );

    const value = useMemo<AnalysisQaContextValue>(
        () => ({
            summary,
            로딩중: isLoading,
            오류: error,
            filtered,
            current,
            selected,
            setSelected,
            typeFilter,
            setTypeFilter,
            glossaryOpen,
            setGlossaryOpen,
            산출물을_재처리한다,
            품질지표를_재계산한다,
        }),
        [
            summary,
            isLoading,
            error,
            filtered,
            current,
            selected,
            typeFilter,
            glossaryOpen,
            산출물을_재처리한다,
            품질지표를_재계산한다,
        ],
    );

    return <AnalysisQaContext.Provider value={value}>{children}</AnalysisQaContext.Provider>;
}

export function useAnalysisQaContext(): AnalysisQaContextValue {
    const ctx = useContext(AnalysisQaContext);
    if (ctx == null) {
        throw new Error('useAnalysisQaContext는 AnalysisQaProvider 내부에서만 사용할 수 있습니다.');
    }
    return ctx;
}
