'use client';

/**
 * 감사 로그 CSV 내보내기 command
 *
 * - 서비스가 직렬화한 CSV 문자열을 받아 브라우저 파일 다운로드를 트리거한다.
 * - 파일 I/O(Blob/anchor)는 순수 UI 상태가 아니라 부수효과이므로 command 레이어에 둔다.
 * - 토스트 피드백은 여기서 처리한다(UI 컴포넌트는 Context 함수만 호출).
 */
import { useCallback } from 'react';

import { useToast } from '@/_ui/hifi';
import type { IAuditLogsService } from '../../../_services/audit-logs.service.interface';
import type { AuditLogsUI } from '../../../_mocks/audit-logs.ui-interface';

interface Params {
    service: IAuditLogsService;
}

export function useAuditExportCommands({ service }: Params) {
    const toast = useToast();

    const 감사_로그를_CSV로_내보낸다 = useCallback(
        async (logs: AuditLogsUI.Log[]) => {
            const res = await service.감사_로그를_CSV로_직렬화한다(logs);
            if (!res.success || res.data == null) {
                toast(res.message, { tone: 'danger' });
                return;
            }
            const blob = new Blob([res.data], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast(`${logs.length}건 CSV로 내보냄`, { tone: 'success' });
        },
        [service, toast],
    );

    return { 감사_로그를_CSV로_내보낸다 };
}
