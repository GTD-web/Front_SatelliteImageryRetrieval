'use client';

/**
 * 크롤 대상(AOI) 통합 Context — queries + commands + UI 상태 조립
 *
 * - Service 주입 패턴으로 Plan(Mock) / Current(실제 API) 환경 분기
 * - 서버 데이터는 useState 로 들지 않고 queries(SWR) 결과를 그대로 전달
 * - selected/activeTool/shpOpen 등 순수 UI 상태만 useState 로 보관
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { MapTool } from '@/_ui/hifi';
import type { ICrawlTargetsService } from '../../_services/crawl-targets.service.interface';
import type { CrawlTargetsUI } from '../../_mocks/crawl-targets.ui-interface';
import { useAoiListQuery } from './queries/use-aoi-list-query';
import { useCrawlCommands } from './commands/use-crawl-commands';

interface CrawlTargetsContextValue {
    // 데이터 (SWR)
    aois: CrawlTargetsUI.Aoi[];
    로딩중: boolean;
    오류: unknown;

    // UI 상태
    selected: string;
    setSelected: (name: string) => void;
    activeTool: MapTool | undefined;
    setActiveTool: (tool: MapTool | undefined) => void;
    shpOpen: boolean;
    openShp: () => void;
    closeShp: () => void;

    // commands
    AOI를_크롤한다: (name: string) => Promise<CrawlTargetsUI.ServiceResponseWithData<CrawlTargetsUI.Aoi>>;
    AOI를_생성한다: (
        input: CrawlTargetsUI.CreateAoiInput,
    ) => Promise<CrawlTargetsUI.ServiceResponseWithData<CrawlTargetsUI.Aoi>>;
    AOI를_편집한다: (name: string) => void;
}

const CrawlTargetsContext = createContext<CrawlTargetsContextValue | undefined>(undefined);

export function CrawlTargetsProvider({
    children,
    uiService,
}: {
    children: ReactNode;
    uiService: ICrawlTargetsService;
}) {
    const [selected, setSelected] = useState('Pohang_coast');
    const [activeTool, setActiveTool] = useState<MapTool | undefined>(undefined);
    const [shpOpen, setShpOpen] = useState(false);

    const listParams = useMemo<CrawlTargetsUI.AoiListParams>(() => ({}), []);

    const { aois, isLoading, error, listKey } = useAoiListQuery({ service: uiService, listParams });

    const { AOI를_크롤한다, AOI를_생성한다, AOI를_편집한다 } = useCrawlCommands({
        service: uiService,
        listKey,
        onAoiCreated: setSelected,
    });

    const value = useMemo<CrawlTargetsContextValue>(
        () => ({
            aois,
            로딩중: isLoading,
            오류: error,
            selected,
            setSelected,
            activeTool,
            setActiveTool,
            shpOpen,
            openShp: () => setShpOpen(true),
            closeShp: () => setShpOpen(false),
            AOI를_크롤한다,
            AOI를_생성한다,
            AOI를_편집한다,
        }),
        [aois, isLoading, error, selected, activeTool, shpOpen, AOI를_크롤한다, AOI를_생성한다, AOI를_편집한다],
    );

    return <CrawlTargetsContext.Provider value={value}>{children}</CrawlTargetsContext.Provider>;
}

export function useCrawlTargetsContext(): CrawlTargetsContextValue {
    const ctx = useContext(CrawlTargetsContext);
    if (ctx == null) {
        throw new Error('useCrawlTargetsContext는 CrawlTargetsProvider 내부에서만 사용할 수 있습니다.');
    }
    return ctx;
}
