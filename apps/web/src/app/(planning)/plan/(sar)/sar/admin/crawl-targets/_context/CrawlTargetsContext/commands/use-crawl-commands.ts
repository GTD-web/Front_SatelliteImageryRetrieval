'use client';

/**
 * AOI 크롤/생성/편집 mutations
 *
 * - 각 mutation 성공 후 listKey 를 mutate 하여 목록 SWR 을 재검증한다.
 * - 토스트 피드백은 여기서 처리한다(UI 컴포넌트는 Context 함수만 호출).
 */
import { useCallback } from 'react';
import { mutate } from 'swr';

import { useToast } from '@/_ui/hifi';
import type { ICrawlTargetsService } from '../../../_services/crawl-targets.service.interface';
import type { CrawlTargetsUI } from '../../../_mocks/crawl-targets.ui-interface';

interface Params {
    service: ICrawlTargetsService;
    listKey: readonly unknown[];
    /** 생성된 AOI 를 선택 상태로 만들기 위한 콜백 */
    onAoiCreated?: (name: string) => void;
}

export function useCrawlCommands({ service, listKey, onAoiCreated }: Params) {
    const toast = useToast();

    const AOI를_크롤한다 = useCallback(
        async (name: string) => {
            toast(`${name} 크롤 시작됨`, { tone: 'success', title: 'ESA 동기화' });
            const res = await service.AOI를_크롤한다(name);
            await mutate(listKey);
            if (res.success) {
                toast(`${name} 크롤 완료`, { tone: 'success' });
            } else {
                toast(res.message, { tone: 'danger' });
            }
            return res;
        },
        [service, listKey, toast],
    );

    const AOI를_생성한다 = useCallback(
        async (input: CrawlTargetsUI.CreateAoiInput) => {
            const res = await service.AOI를_생성한다(input);
            await mutate(listKey);
            if (res.success && res.data) {
                onAoiCreated?.(res.data.name);
                toast(`${res.data.name} 생성됨 · ${input.coords.length}개 vertex`, {
                    tone: 'success',
                    title: '새 AOI',
                });
            } else if (!res.success) {
                toast(res.message, { tone: 'danger' });
            }
            return res;
        },
        [service, listKey, toast, onAoiCreated],
    );

    const AOI를_편집한다 = useCallback(
        (name: string) => {
            // TODO: 편집 패널 연결 (현재는 플레이스홀더)
            toast(`${name} 편집 패널 준비 중`);
        },
        [toast],
    );

    return {
        AOI를_크롤한다,
        AOI를_생성한다,
        AOI를_편집한다,
    };
}
