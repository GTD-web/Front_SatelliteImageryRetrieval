'use client';

/**
 * 다운로드 잡 목록 SWR 조회
 *
 * - Context 는 서버 데이터를 useState 로 들지 않고, 이 훅의 SWR 결과를 그대로 전달한다.
 * - 필터/탭은 UI 상태로 Context 가 보관하고, 여기서는 원본 목록만 가져온다.
 * - 반환하는 jobsKey 는 commands 가 mutate 로 재검증할 때 사용한다.
 */
import { useMemo } from 'react';
import useSWR from 'swr';

import type { IDownloadsService } from '../../../_services/downloads.service.interface';
import type { DownloadsUI } from '../../../_mocks/downloads.ui-interface';
import { createJobsKey } from '../utils/swr-keys';

interface Params {
    service: IDownloadsService;
}

export function useJobsQuery({ service }: Params) {
    const jobsKey = useMemo(() => createJobsKey(), []);

    const { data, error, isLoading } = useSWR(
        jobsKey,
        () => service.다운로드_잡_목록을_조회한다(),
        { revalidateOnFocus: false, dedupingInterval: 1000 },
    );

    const jobs: DownloadsUI.Job[] = useMemo(
        () => (data?.success && data.data ? data.data.jobs : []),
        [data],
    );

    return {
        jobs,
        isLoading,
        error,
        /** commands 가 mutate 호출 시 사용 */
        jobsKey,
    };
}
