'use client';

/**
 * AOI 목록 SWR 조회
 *
 * - Context 는 서버 데이터를 useState 로 들지 않고, 이 훅의 SWR 결과를 그대로 전달한다.
 * - 반환하는 listKey 는 commands 가 mutate 로 재검증할 때 사용한다.
 */
import { useMemo } from 'react';
import useSWR from 'swr';

import type { ICrawlTargetsService } from '../../../_services/crawl-targets.service.interface';
import type { CrawlTargetsUI } from '../../../_mocks/crawl-targets.ui-interface';
import { createAoiListKey } from '../utils/swr-keys';

interface Params {
    service: ICrawlTargetsService;
    listParams: CrawlTargetsUI.AoiListParams;
}

export function useAoiListQuery({ service, listParams }: Params) {
    const listKey = useMemo(() => createAoiListKey(listParams), [listParams]);

    const { data, error, isLoading } = useSWR(
        listKey,
        () => service.AOI_목록을_조회한다(listParams),
        { revalidateOnFocus: false, dedupingInterval: 3000 },
    );

    const aois: CrawlTargetsUI.Aoi[] = useMemo(
        () => (data?.success && data.data ? data.data.aois : []),
        [data],
    );

    return {
        aois,
        isLoading,
        error,
        /** commands 가 mutate 호출 시 사용 */
        listKey,
    };
}
