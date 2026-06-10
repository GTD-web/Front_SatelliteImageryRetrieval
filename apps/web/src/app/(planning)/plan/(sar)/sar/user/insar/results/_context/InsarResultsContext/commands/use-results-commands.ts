'use client';

/**
 * InSAR 결과 뷰어 액션 — 산출물 다운로드 / 시계열 CSV 내보내기
 *
 * - 다운로드는 서비스 호출 후 토스트로 피드백한다(UI 컴포넌트는 Context 함수만 호출).
 * - CSV 내보내기는 서버 변경이 아니라 현재 선택 점들을 파일로 떨구는 순수 클라이언트 액션.
 */
import { useCallback } from 'react';

import { useToast } from '@/_ui/hifi';
import type { IInsarResultsService } from '../../../_services/insar-results.service.interface';
import type { InsarResultsUI } from '../../../_mocks/insar-results.ui-interface';
import { TIMESERIES_DATES } from '../../../_constants/insar-results-layers';

interface Params {
    service: IInsarResultsService;
}

export function useResultsCommands({ service }: Params) {
    const toast = useToast();

    const 산출물을_다운로드한다 = useCallback(
        async (productId: string) => {
            const res = await service.산출물_다운로드를_요청한다(productId);
            if (res.success) {
                toast(res.message, { tone: 'success' });
            } else {
                toast(res.message, { tone: 'danger' });
            }
            return res;
        },
        [service, toast],
    );

    /** 선택 점들의 시계열을 CSV 로 내보낸다 — 점이 없으면 경고만 띄운다. */
    const 시계열을_CSV로_내보낸다 = useCallback(
        (points: InsarResultsUI.Point[], productId: string) => {
            if (points.length === 0) {
                toast('내보낼 점이 없습니다', { tone: 'warning' });
                return;
            }
            const header = 'date,' + points.map((p) => p.id).join(',') + '\n';
            const rows = TIMESERIES_DATES.map(
                (d, i) => d + ',' + points.map((p) => p.series[i] ?? '').join(','),
            ).join('\n');
            const blob = new Blob([header + rows], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `insar-${productId}-timeseries.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast(`${points.length}개 점 시계열 CSV로 내보냄`, { tone: 'success' });
        },
        [toast],
    );

    return {
        산출물을_다운로드한다,
        시계열을_CSV로_내보낸다,
    };
}
