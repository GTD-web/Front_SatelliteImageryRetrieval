'use client';

/**
 * 다운로드 잡 mutations — 재시도 / NAS 다운로드 / 스테이징 진행 시뮬레이션 / 대기 충원
 *
 * - 각 mutation 성공 후 jobsKey 를 mutate 하여 목록 SWR 을 재검증한다.
 * - 토스트 피드백은 여기서 처리한다(UI 컴포넌트는 Context 함수만 호출).
 * - 진행 틱/대기 충원은 서버 상태(스테이징 진행)를 변경하는 mutation 이며,
 *   Context 가 interval 로 주기 호출한다. (Current 에서는 폴링으로 대체될 자리)
 */
import { useCallback } from 'react';
import { mutate } from 'swr';

import { useToast } from '@/_ui/hifi';
import type { IDownloadsService } from '../../../_services/downloads.service.interface';

interface Params {
    service: IDownloadsService;
    jobsKey: readonly unknown[];
}

export function useJobsCommands({ service, jobsKey }: Params) {
    const toast = useToast();

    const 다운로드를_재시도한다 = useCallback(
        async (id: string) => {
            const res = await service.다운로드를_재시도한다(id);
            await mutate(jobsKey);
            if (res.success) {
                toast('재시도 대기열에 추가됨', { tone: 'success' });
            } else {
                toast(res.message, { tone: 'danger' });
            }
            return res;
        },
        [service, jobsKey, toast],
    );

    const NAS에서_다운로드한다 = useCallback(
        async (id: string) => {
            const res = await service.NAS에서_다운로드한다(id);
            if (res.success) {
                toast(res.message, { tone: 'success' });
            } else {
                toast(res.message, { tone: 'danger' });
            }
            return res;
        },
        [service, toast],
    );

    // 진행 틱 — running 잡 progress 를 한 단계 전진시키고 재검증
    const 스테이징_진행을_시뮬레이션한다 = useCallback(async () => {
        await service.스테이징_진행을_시뮬레이션한다();
        await mutate(jobsKey);
    }, [service, jobsKey]);

    // 슬롯이 비면 대기 잡 1건을 시작하고 재검증
    const 대기_잡을_시작한다 = useCallback(async () => {
        await service.대기_잡을_시작한다();
        await mutate(jobsKey);
    }, [service, jobsKey]);

    return {
        다운로드를_재시도한다,
        NAS에서_다운로드한다,
        스테이징_진행을_시뮬레이션한다,
        대기_잡을_시작한다,
    };
}
