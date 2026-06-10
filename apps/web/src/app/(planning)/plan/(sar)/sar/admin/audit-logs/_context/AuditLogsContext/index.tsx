'use client';

/**
 * 감사 로그 통합 Context — query + commands + UI 상태 조립
 *
 * - Service 주입 패턴으로 Plan(Mock) / Current(실제 API) 환경 분기
 * - 서버 데이터(logs/actionGroups/latestDate)는 useState 로 들지 않고 query(SWR) 결과를 그대로 전달
 * - q/cat/adv/advOpen 등 순수 UI 상태만 useState 로 보관
 * - filtered/advChips 는 서버 데이터 + UI 상태에서 파생한 계산값(useMemo)
 * - CSV 내보내기는 파일 I/O 부수효과라 commands 레이어에 둔다.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { IAuditLogsService } from '../../_services/audit-logs.service.interface';
import type { AuditLogsUI } from '../../_mocks/audit-logs.ui-interface';
import { EMPTY_ADV, advCount, matchesAdv } from '../../_constants/audit-logs-filter';
import { useAuditLogsQuery } from './queries/use-audit-logs-query';
import { useAuditExportCommands } from './commands/use-audit-export-commands';

/** 카테고리 필터 ('전체' + 카테고리) */
export type CategoryFilter = '전체' | AuditLogsUI.Category;

/** 적용된 고급 필터 칩 1건 */
export interface AdvChip {
    key: string;
    label: string;
    onRemove: () => void;
}

interface AuditLogsContextValue {
    // 데이터 (SWR)
    logs: AuditLogsUI.Log[];
    actionGroups: AuditLogsUI.ActionGroup[];
    latestDate: string;
    로딩중: boolean;
    오류: unknown;

    // 파생 (서버 데이터 + UI 상태)
    filtered: AuditLogsUI.Log[];
    advChips: AdvChip[];
    nAdv: number;

    // UI 상태
    q: string;
    setQ: (q: string) => void;
    cat: CategoryFilter;
    setCat: (c: CategoryFilter) => void;
    adv: AuditLogsUI.AdvFilter;
    setAdv: (f: AuditLogsUI.AdvFilter) => void;
    advOpen: boolean;
    setAdvOpen: (open: boolean) => void;
    clearAdv: () => void;

    // commands
    감사_로그를_CSV로_내보낸다: (logs: AuditLogsUI.Log[]) => Promise<void>;
}

const AuditLogsContext = createContext<AuditLogsContextValue | undefined>(undefined);

export function AuditLogsProvider({ children, uiService }: { children: ReactNode; uiService: IAuditLogsService }) {
    const [q, setQ] = useState('');
    const [cat, setCat] = useState<CategoryFilter>('전체');
    const [adv, setAdv] = useState<AuditLogsUI.AdvFilter>(EMPTY_ADV);
    const [advOpen, setAdvOpen] = useState(false);

    const listParams = useMemo<AuditLogsUI.LogListParams>(() => ({}), []);

    const { logs, actionGroups, latestDate, isLoading, error } = useAuditLogsQuery({
        service: uiService,
        listParams,
    });

    const { 감사_로그를_CSV로_내보낸다 } = useAuditExportCommands({ service: uiService });

    const filtered = useMemo(
        () =>
            logs.filter((l) => {
                if (cat !== '전체' && l.cat !== cat) return false;
                if (
                    q &&
                    !l.actor.toLowerCase().includes(q.toLowerCase()) &&
                    !l.target.toLowerCase().includes(q.toLowerCase()) &&
                    !l.action.toLowerCase().includes(q.toLowerCase())
                )
                    return false;
                if (!matchesAdv(l, adv)) return false;
                return true;
            }),
        [logs, q, cat, adv],
    );

    const nAdv = advCount(adv);

    /** 적용된 고급 필터를 제거 가능한 칩 목록으로 변환. */
    const advChips = useMemo<AdvChip[]>(() => {
        const chips: AdvChip[] = [];
        if (adv.start || adv.end) {
            chips.push({
                key: 'range',
                label: `기간: ${adv.start || '처음'} ~ ${adv.end || '끝'}`,
                onRemove: () => setAdv((f) => ({ ...f, start: '', end: '' })),
            });
        }
        adv.actorTypes.forEach((t) =>
            chips.push({
                key: `actor-${t}`,
                label: `액터: ${t}`,
                onRemove: () => setAdv((f) => ({ ...f, actorTypes: f.actorTypes.filter((x) => x !== t) })),
            }),
        );
        adv.actions.forEach((a) =>
            chips.push({
                key: `action-${a}`,
                label: a,
                onRemove: () => setAdv((f) => ({ ...f, actions: f.actions.filter((x) => x !== a) })),
            }),
        );
        if (adv.outcome !== 'all') {
            chips.push({
                key: 'outcome',
                label: adv.outcome === 'fail' ? '실패만' : '성공만',
                onRemove: () => setAdv((f) => ({ ...f, outcome: 'all' })),
            });
        }
        return chips;
    }, [adv]);

    const clearAdv = () => setAdv(EMPTY_ADV);

    const value = useMemo<AuditLogsContextValue>(
        () => ({
            logs,
            actionGroups,
            latestDate,
            로딩중: isLoading,
            오류: error,
            filtered,
            advChips,
            nAdv,
            q,
            setQ,
            cat,
            setCat,
            adv,
            setAdv,
            advOpen,
            setAdvOpen,
            clearAdv,
            감사_로그를_CSV로_내보낸다,
        }),
        [
            logs,
            actionGroups,
            latestDate,
            isLoading,
            error,
            filtered,
            advChips,
            nAdv,
            q,
            cat,
            adv,
            advOpen,
            감사_로그를_CSV로_내보낸다,
        ],
    );

    return <AuditLogsContext.Provider value={value}>{children}</AuditLogsContext.Provider>;
}

export function useAuditLogsContext(): AuditLogsContextValue {
    const ctx = useContext(AuditLogsContext);
    if (ctx == null) {
        throw new Error('useAuditLogsContext는 AuditLogsProvider 내부에서만 사용할 수 있습니다.');
    }
    return ctx;
}
