'use client';

/**
 * 분석 품질(InSAR QA) 액션 — 산출물 재처리 요청 / 품질 지표 재계산
 *
 * - 재처리 요청 후 summaryKey 를 mutate 하여 요약 SWR 을 재검증한다.
 * - 토스트 피드백은 여기서 처리한다(UI 컴포넌트는 Context 함수만 호출).
 */
import { useCallback } from 'react';
import { mutate } from 'swr';

import { useToast } from '@/_ui/hifi';
import type { IAnalysisQaService } from '../../../_services/analysis-qa.service.interface';

interface Params {
    service: IAnalysisQaService;
    summaryKey: readonly unknown[];
}

export function useQaCommands({ service, summaryKey }: Params) {
    const toast = useToast();

    const 산출물을_재처리한다 = useCallback(
        async (name: string) => {
            const res = await service.산출물_재처리를_요청한다(name);
            await mutate(summaryKey);
            if (res.success) {
                toast(res.message, { tone: 'success', title: '재처리 요청' });
            } else {
                toast(res.message, { tone: 'danger' });
            }
            return res;
        },
        [service, summaryKey, toast],
    );

    /** 품질 지표 재계산 — 서버 변경이 아니라 요약 SWR 만 재검증하는 순수 UI 액션. */
    const 품질지표를_재계산한다 = useCallback(async () => {
        await mutate(summaryKey);
        toast('품질 지표 재계산됨', { tone: 'success' });
    }, [summaryKey, toast]);

    return {
        산출물을_재처리한다,
        품질지표를_재계산한다,
    };
}
