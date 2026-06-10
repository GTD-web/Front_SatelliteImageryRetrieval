'use client';

/**
 * InSAR 결과 데이터 SWR 조회
 *
 * - Context 는 서버 데이터(산출물 목록)를 useState 로 들지 않고, 이 훅의 SWR 결과를 그대로 전달한다.
 * - selected/layer/colormap 같은 UI 상태는 Context 가 보관하고, 여기서는 목록만 가져온다.
 */
import { useMemo } from 'react';
import useSWR from 'swr';

import type { IInsarResultsService } from '../../../_services/insar-results.service.interface';
import type { InsarResultsUI } from '../../../_mocks/insar-results.ui-interface';
import { createInsarResultsKey } from '../utils/swr-keys';

interface Params {
    service: IInsarResultsService;
}

/** 재검증 중에도 화면이 깜빡이지 않도록 유지하는 빈 데이터. */
const EMPTY_DATA: InsarResultsUI.ResultsData = {
    products: [],
};

export function useResultsDataQuery({ service }: Params) {
    const dataKey = useMemo(() => createInsarResultsKey(), []);

    const { data, error, isLoading } = useSWR(
        dataKey,
        () => service.결과_데이터를_조회한다(),
        { revalidateOnFocus: false, dedupingInterval: 3000, keepPreviousData: true },
    );

    const resultsData: InsarResultsUI.ResultsData = useMemo(
        () => (data?.success && data.data ? data.data : EMPTY_DATA),
        [data],
    );

    return {
        resultsData,
        isLoading,
        error,
        dataKey,
    };
}
