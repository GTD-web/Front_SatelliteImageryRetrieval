'use client';

/**
 * 기법 적합도 평가 SWR 조회 (자동 모드 추천)
 *
 * - 위치(AOI)+기간만으로 세 기법(DInSAR/SBAS/PSInSAR)의 예상 적합도를 평가한다.
 * - Context 는 추천 결과를 useState 로 들지 않고, 이 훅의 SWR 결과를 그대로 전달한다.
 * - AOI 가 유효하지 않으면(빈 결과) 자동 추천 패널이 "위치·기간을 설정하세요" 를 안내한다.
 */
import { useMemo } from 'react';
import useSWR from 'swr';

import type { IInsarRequestService } from '../../../_services/insar-request.service.interface';
import type { InsarRequestUI } from '../../../_mocks/insar-request.ui-interface';
import { createAssessKey } from '../utils/swr-keys';

interface Params {
    service: IInsarRequestService;
    assessParams: InsarRequestUI.AssessParams;
}

const EMPTY: InsarRequestUI.Recommendation[] = [];

export function useMethodAssessmentQuery({ service, assessParams }: Params) {
    const key = useMemo(() => createAssessKey(assessParams), [assessParams]);

    const { data, error, isLoading, isValidating } = useSWR(
        key,
        () => service.기법_적합도를_평가한다(assessParams),
        { revalidateOnFocus: false, dedupingInterval: 300, keepPreviousData: true },
    );

    const recommendations: InsarRequestUI.Recommendation[] = useMemo(
        () => (data?.success && data.data ? data.data : EMPTY),
        [data],
    );

    return { recommendations, isLoading, isValidating, error, key };
}
