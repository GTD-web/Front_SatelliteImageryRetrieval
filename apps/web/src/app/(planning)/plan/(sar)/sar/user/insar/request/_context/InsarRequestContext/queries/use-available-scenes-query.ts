'use client';

/**
 * 가용 scene 카탈로그 SWR 조회
 *
 * - Context 는 가용 scene 목록을 useState 로 들지 않고, 이 훅의 SWR 결과를 그대로 전달한다.
 * - 키는 (AOI + 기간 + 미션) 조합이라, 조건이 바뀌면 자동으로 재조회된다.
 */
import { useMemo } from 'react';
import useSWR from 'swr';

import type { IInsarRequestService } from '../../../_services/insar-request.service.interface';
import type { InsarRequestUI } from '../../../_mocks/insar-request.ui-interface';
import { createAvailableScenesKey } from '../utils/swr-keys';

interface Params {
    service: IInsarRequestService;
    scenesParams: InsarRequestUI.AvailableScenesParams;
}

/** 재검증 중에도 화면이 깜빡이지 않도록 유지하는 빈 결과. */
const EMPTY: InsarRequestUI.AvailableScene[] = [];

export function useAvailableScenesQuery({ service, scenesParams }: Params) {
    const key = useMemo(() => createAvailableScenesKey(scenesParams), [scenesParams]);

    const { data, error, isLoading, isValidating } = useSWR(
        key,
        () => service.가용_씬을_조회한다(scenesParams),
        { revalidateOnFocus: false, dedupingInterval: 300, keepPreviousData: true },
    );

    const scenes: InsarRequestUI.AvailableScene[] = useMemo(
        () => (data?.success && data.data ? data.data : EMPTY),
        [data],
    );

    return { scenes, isLoading, isValidating, error, key };
}
