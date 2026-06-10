'use client';

/**
 * Scene 검색 SWR 조회
 *
 * - Context 는 검색 결과(scene 목록)를 useState 로 들지 않고, 이 훅의 SWR 결과를 그대로 전달한다.
 * - 키는 (플랫폼 + 적용된 필터 + 검색어) 조합이라, 조건이 바뀌면 자동으로 재검색된다.
 * - filters(사이드바 입력) 와 appliedFilters(실제 검색 조건) 의 분리는 Context 가 담당한다.
 */
import { useMemo } from 'react';
import useSWR from 'swr';

import type { ISearchService } from '../../../_services/search.service.interface';
import type { SearchUI } from '../../../_mocks/search.ui-interface';
import { createSceneSearchKey } from '../utils/swr-keys';

interface Params {
    service: ISearchService;
    searchParams: SearchUI.SearchParams;
}

/** 재검증 중에도 화면이 깜빡이지 않도록 유지하는 빈 결과. */
const EMPTY_RESULT: SearchUI.SearchResult = { scenes: [], facetCounts: {} };

export function useSceneSearchQuery({ service, searchParams }: Params) {
    // 결과는 (적용 필터) 가 바뀔 때마다 항상 조회한다. "검색 중…" 오버레이 노출 여부는
    // Context 의 hasSearched 로 따로 제어하므로, 여기서는 결과 자체를 게이팅하지 않는다.
    const key = useMemo(() => createSceneSearchKey(searchParams), [searchParams]);

    const { data, error, isLoading, isValidating } = useSWR(
        key,
        () => service.씬을_검색한다(searchParams),
        { revalidateOnFocus: false, dedupingInterval: 300, keepPreviousData: true },
    );

    const result: SearchUI.SearchResult = useMemo(
        () => (data?.success && data.data ? data.data : EMPTY_RESULT),
        [data],
    );

    return {
        scenes: result.scenes,
        facetCounts: result.facetCounts,
        isLoading,
        isValidating,
        error,
        key,
    };
}
