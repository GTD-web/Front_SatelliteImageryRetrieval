'use client';

/**
 * AOI 목록 SWR 조회 (전체 목록)
 *
 * - Context 는 서버 데이터를 useState 로 들지 않고, 이 훅의 SWR 결과를 그대로 전달한다.
 * - 검색(q) 필터는 화면 단의 UI 상태로 분리하므로 여기서는 전체 목록을 받는다.
 * - 반환하는 listKey 는 commands 가 mutate 로 재검증할 때 사용한다.
 */
import { useMemo } from 'react';
import useSWR from 'swr';

import type { IAoisService } from '../../../_services/aois.service.interface';
import type { AoisUI } from '../../../_mocks/aois.ui-interface';
import { createAoiListKey } from '../utils/swr-keys';

interface Params {
    service: IAoisService;
}

export function useAoiListQuery({ service }: Params) {
    const listKey = useMemo(() => createAoiListKey(), []);

    const { data, error, isLoading } = useSWR(listKey, () => service.AOI_목록을_조회한다(), {
        revalidateOnFocus: false,
        dedupingInterval: 3000,
    });

    const aois: AoisUI.Aoi[] = useMemo(
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
