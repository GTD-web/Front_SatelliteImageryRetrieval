'use client';

/**
 * 실패 다운로드 목록 SWR 조회
 *
 * - Context 는 서버 데이터를 useState 로 들지 않고, 이 훅의 SWR 결과를 그대로 전달한다.
 * - 필터/검색/선택은 UI 상태로 Context 가 보관하고, 여기서는 원본 목록만 가져온다.
 * - 반환하는 listKey 는 commands 가 mutate 로 재검증할 때 사용한다.
 */
import { useMemo } from 'react';
import useSWR from 'swr';

import type { IFailedDownloadsService } from '../../../_services/failed-downloads.service.interface';
import type { FailedDownloadsUI } from '../../../_mocks/failed-downloads.ui-interface';
import { createFailedJobsKey } from '../utils/swr-keys';

interface Params {
    service: IFailedDownloadsService;
    listParams: FailedDownloadsUI.FailedJobListParams;
}

export function useFailedJobsQuery({ service, listParams }: Params) {
    const listKey = useMemo(() => createFailedJobsKey(listParams), [listParams]);

    const { data, error, isLoading } = useSWR(
        listKey,
        () => service.실패_다운로드_목록을_조회한다(listParams),
        { revalidateOnFocus: false, dedupingInterval: 3000 },
    );

    const jobs: FailedDownloadsUI.FailedJob[] = useMemo(
        () => (data?.success && data.data ? data.data.jobs : []),
        [data],
    );

    return {
        jobs,
        isLoading,
        error,
        /** commands 가 mutate 호출 시 사용 */
        listKey,
    };
}
