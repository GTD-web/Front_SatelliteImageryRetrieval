'use client';

/**
 * 분석 품질 요약 SWR 조회
 *
 * - Context 는 서버 데이터를 useState 로 들지 않고, 이 훅의 SWR 결과를 그대로 전달한다.
 * - selected/typeFilter 같은 UI 상태는 Context 가 보관하고, 여기서는 요약만 가져온다.
 */
import { useMemo } from 'react';
import useSWR from 'swr';

import type { IAnalysisQaService } from '../../../_services/analysis-qa.service.interface';
import type { AnalysisQaUI } from '../../../_mocks/analysis-qa.ui-interface';
import { createAnalysisQaSummaryKey } from '../utils/swr-keys';

interface Params {
    service: IAnalysisQaService;
}

/** 재검증 중에도 화면이 깜빡이지 않도록 유지하는 빈 요약. */
const EMPTY_SUMMARY: AnalysisQaUI.QaSummary = {
    scored: [],
    kpis: [],
    lowAlerts: 0,
    worklist: [],
    profile: [],
    glossary: [],
};

export function useQaSummaryQuery({ service }: Params) {
    const summaryKey = useMemo(() => createAnalysisQaSummaryKey(), []);

    const { data, error, isLoading } = useSWR(
        summaryKey,
        () => service.분석품질_요약을_조회한다(),
        { revalidateOnFocus: false, dedupingInterval: 3000, keepPreviousData: true },
    );

    const summary: AnalysisQaUI.QaSummary = useMemo(
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
