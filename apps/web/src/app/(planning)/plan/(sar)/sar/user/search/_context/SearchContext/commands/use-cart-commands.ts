'use client';

/**
 * 장바구니(카트) 담기 commands
 *
 * - 카트 상태는 페이지 간 공유되는 HifiCartContext 가 보관한다(검색 서비스로 옮기지 않음).
 * - 여기서는 담기 동작에 토스트 피드백을 더해 UI 가 Context 함수만 호출하도록 한다.
 */
import { useCallback } from 'react';

import { useToast } from '@/_ui/hifi';
import { useHifiCart, type HifiScene } from '@/_shared/contexts/HifiCartContext';

export function useCartCommands() {
    const toast = useToast();
    const { has: inCart, add, addMany } = useHifiCart();

    /** scene 한 건 담기(이미 있으면 안내만). */
    const 씬을_담는다 = useCallback(
        (s: HifiScene) => {
            const already = inCart(s.id);
            add(s);
            toast(already ? '이미 장바구니에 있습니다' : `${s.id.slice(0, 32)}… 담음`, {
                tone: already ? 'warning' : 'success',
            });
        },
        [inCart, add, toast],
    );

    /** 모달 등에서 조용히 담고 짧게 안내. */
    const 씬을_담고_안내한다 = useCallback(
        (s: HifiScene) => {
            add(s);
            toast('장바구니에 담음', { tone: 'success' });
        },
        [add, toast],
    );

    /** 체크된 scene 들을 담는다. 비어 있으면 경고. */
    const 선택한_씬을_담는다 = useCallback(
        (scenes: HifiScene[]) => {
            if (scenes.length === 0) {
                toast('선택된 scene이 없습니다', { tone: 'warning' });
                return false;
            }
            addMany(scenes);
            toast(`${scenes.length}개 scene 담음`, { tone: 'success', title: '장바구니 추가' });
            return true;
        },
        [addMany, toast],
    );

    /** 현재 결과 전체를 담는다. */
    const 전체_씬을_담는다 = useCallback(
        (scenes: HifiScene[]) => {
            addMany(scenes);
            toast(`${scenes.length}개 scene 담음`, { tone: 'success' });
        },
        [addMany, toast],
    );

    return {
        inCart,
        씬을_담는다,
        씬을_담고_안내한다,
        선택한_씬을_담는다,
        전체_씬을_담는다,
    };
}
