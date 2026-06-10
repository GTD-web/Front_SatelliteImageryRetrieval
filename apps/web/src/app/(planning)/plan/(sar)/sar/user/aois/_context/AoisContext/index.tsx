'use client';

/**
 * 저장된 AOI 라이브러리 통합 Context — queries + commands + UI 상태 조립
 *
 * - Service 주입 패턴으로 Plan(Mock) / Current(실제 API) 환경 분기
 * - 서버 데이터는 useState 로 들지 않고 queries(SWR) 결과를 그대로 전달
 * - q/selected/draft/editing/activeTool/focus 등 순수 UI 상태만 useState 로 보관
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { useToast, type MapFocus, type MapFootprint, type MapTool } from '@/_ui/hifi';
import type { DrawnGeometry } from '@/_ui/hifi/MapCanvas';
import type { AoisUI } from '../../_mocks/aois.ui-interface';
import { APPLY_TARGET_PATH, aoiRingToBounds, aoiToRing, type ApplyTarget } from '../../_constants/aois-apply';
import { useAoiListQuery } from './queries/use-aoi-list-query';
import { useAoiCommands } from './commands/use-aoi-commands';

interface AoisContextValue {
    // 데이터 (SWR)
    aois: AoisUI.Aoi[];
    filtered: AoisUI.Aoi[];
    footprints: MapFootprint[];
    로딩중: boolean;
    오류: unknown;

    // UI 상태
    q: string;
    setQ: (q: string) => void;
    selected: string | null;
    activeTool: MapTool | undefined;
    setActiveTool: (tool: MapTool | undefined) => void;
    focus: MapFocus | null;
    draft: AoisUI.AoiBounds | null;
    closeDraft: () => void;
    editing: AoisUI.Aoi | null;
    openEditing: (aoi: AoisUI.Aoi) => void;
    closeEditing: () => void;

    // 동작
    focusAoi: (aoi: AoisUI.Aoi) => void;
    goApply: (aoi: AoisUI.Aoi, target: ApplyTarget) => void;
    handleDrawEnd: (tool: MapTool, geom: DrawnGeometry) => void;

    // commands
    AOI를_등록한다: (input: AoisUI.CreateAoiInput) => void;
    AOI를_수정한다: (input: AoisUI.RenameAoiInput) => void;
    AOI를_삭제한다: (aoi: AoisUI.Aoi) => void;
}

const AoisContext = createContext<AoisContextValue | undefined>(undefined);

export function AoisProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const toast = useToast();

    const [q, setQ] = useState('');
    const [selected, setSelected] = useState<string | null>(null);
    /** 지도에서 그려 캡처한 좌표. 채워지면 등록 모달이 prefill 된 채로 열린다. */
    const [draft, setDraft] = useState<AoisUI.AoiBounds | null>(null);
    const [editing, setEditing] = useState<AoisUI.Aoi | null>(null);
    const [activeTool, setActiveTool] = useState<MapTool | undefined>(undefined);
    /** 목록 클릭 시 지도를 해당 AOI 로 줌인시키는 신호 */
    const [focus, setFocus] = useState<MapFocus | null>(null);

    const { aois, isLoading, error } = useAoiListQuery();

    const commands = useAoiCommands({
        onAoiCreated: setSelected,
        onAoiRemoved: (id) => setSelected((cur) => (cur === id ? null : cur)),
    });

    const filtered = useMemo(
        () =>
            aois.filter(
                (a) =>
                    q === '' ||
                    a.name.toLowerCase().includes(q.toLowerCase()) ||
                    (a.description ?? '').toLowerCase().includes(q.toLowerCase()),
            ),
        [aois, q],
    );

    /** 좌측 목록(검색 반영)을 지도 풋프린트로. 선택된 항목은 강조(active). */
    const footprints = useMemo<MapFootprint[]>(
        () =>
            filtered.map((a) => ({
                id: a.id,
                coords: aoiToRing(a),
                kind: 'aoi',
                label: a.name,
                active: selected === a.id,
                onClick: () => setSelected(a.id),
            })),
        [filtered, selected],
    );

    /** 목록 항목 클릭 — 선택 강조 + 지도 줌인. 같은 항목을 다시 클릭해도 재줌인되도록 key 에 시각 포함. */
    const focusAoi = useCallback((a: AoisUI.Aoi) => {
        setSelected(a.id);
        setFocus({ coords: aoiToRing(a), key: `${a.id}:${Date.now()}` });
    }, []);

    const goApply = useCallback(
        (a: AoisUI.Aoi, target: ApplyTarget) => {
            router.push(`${APPLY_TARGET_PATH[target]}?aoi=${encodeURIComponent(a.id)}`);
        },
        [router],
    );

    /** 지도에서 사각형을 다 그리면 좌표를 캡처해 등록 모달을 prefill 한 채로 연다. */
    const handleDrawEnd = useCallback(
        (_tool: MapTool, geom: DrawnGeometry) => {
            if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
                const ring = (geom.coordinates as number[][][])[0];
                if (ring && ring.length >= 3) {
                    const coords = ring.map(([lon, lat]) => [lon, lat] as [number, number]);
                    const bounds = aoiRingToBounds(coords);
                    if (bounds) {
                        setDraft(bounds);
                        toast('AOI 영역이 캡처되었습니다', { tone: 'success' });
                    }
                }
            }
            setActiveTool(undefined);
        },
        [toast],
    );

    const AOI를_등록한다 = useCallback(
        (input: AoisUI.CreateAoiInput) => {
            void commands.AOI를_등록한다(input);
            setDraft(null);
        },
        [commands],
    );

    const AOI를_수정한다 = useCallback(
        (input: AoisUI.RenameAoiInput) => {
            void commands.AOI를_수정한다(input);
            setEditing(null);
        },
        [commands],
    );

    const AOI를_삭제한다 = useCallback(
        (aoi: AoisUI.Aoi) => {
            void commands.AOI를_삭제한다(aoi);
        },
        [commands],
    );

    const value = useMemo<AoisContextValue>(
        () => ({
            aois,
            filtered,
            footprints,
            로딩중: isLoading,
            오류: error,
            q,
            setQ,
            selected,
            activeTool,
            setActiveTool,
            focus,
            draft,
            closeDraft: () => setDraft(null),
            editing,
            openEditing: (aoi) => setEditing(aoi),
            closeEditing: () => setEditing(null),
            focusAoi,
            goApply,
            handleDrawEnd,
            AOI를_등록한다,
            AOI를_수정한다,
            AOI를_삭제한다,
        }),
        [
            aois,
            filtered,
            footprints,
            isLoading,
            error,
            q,
            selected,
            activeTool,
            focus,
            draft,
            editing,
            focusAoi,
            goApply,
            handleDrawEnd,
            AOI를_등록한다,
            AOI를_수정한다,
            AOI를_삭제한다,
        ],
    );

    return <AoisContext.Provider value={value}>{children}</AoisContext.Provider>;
}

export function useAoisContext(): AoisContextValue {
    const ctx = useContext(AoisContext);
    if (ctx == null) {
        throw new Error('useAoisContext는 AoisProvider 내부에서만 사용할 수 있습니다.');
    }
    return ctx;
}
