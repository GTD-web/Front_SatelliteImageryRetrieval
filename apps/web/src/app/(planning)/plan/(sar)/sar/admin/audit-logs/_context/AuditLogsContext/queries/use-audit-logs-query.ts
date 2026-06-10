'use client';

/**
 * 감사 로그 목록 SWR 조회
 *
 * - Context 는 서버 데이터를 useState 로 들지 않고, 이 훅의 SWR 결과를 그대로 전달한다.
 * - 검색/카테고리/고급 필터는 UI 상태로 Context 가 보관하고, 여기서는 원본 목록만 가져온다.
 * - 액션 그룹/최신 로그일 같은 파생 메타도 서버 응답에서 함께 받는다.
 */
import { useMemo } from 'react';
import useSWR from 'swr';

import type { IAuditLogsService } from '../../../_services/audit-logs.service.interface';
import type { AuditLogsUI } from '../../../_mocks/audit-logs.ui-interface';
import { createAuditLogsKey } from '../utils/swr-keys';

interface Params {
    service: IAuditLogsService;
    listParams: AuditLogsUI.LogListParams;
}

export function useAuditLogsQuery({ service, listParams }: Params) {
    const listKey = useMemo(() => createAuditLogsKey(listParams), [listParams]);

    const { data, error, isLoading } = useSWR(
        listKey,
        () => service.감사_로그_목록을_조회한다(listParams),
        { revalidateOnFocus: false, dedupingInterval: 3000 },
    );

    const logs: AuditLogsUI.Log[] = useMemo(() => (data?.success && data.data ? data.data.logs : []), [data]);
    const actionGroups: AuditLogsUI.ActionGroup[] = useMemo(
        () => (data?.success && data.data ? data.data.actionGroups : []),
        [data],
    );
    const latestDate: string = useMemo(
        () => (data?.success && data.data ? data.data.latestDate : ''),
        [data],
    );

    return {
        logs,
        actionGroups,
        latestDate,
        isLoading,
        error,
        listKey,
    };
}
