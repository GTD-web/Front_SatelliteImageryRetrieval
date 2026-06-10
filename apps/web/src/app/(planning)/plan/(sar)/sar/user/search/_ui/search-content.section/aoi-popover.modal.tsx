'use client';

/**
 * AOI 영역 설정 팝오버(포털) — 사각형 그리기 진입 / 저장된 AOI 저장·불러오기 / 좌표 직접 입력.
 *
 * ⚠️ "AOI 저장 / 불러오기" 는 페이지 간 공유되는 SavedAoisContext 를 쓰는 컴포넌트
 * (SaveAoiButton / LoadAoiMenu)를 그대로 사용한다. 검색 서비스로 옮기지 않는다.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Icon } from '@/_ui/hifi';

import { LoadAoiMenu, SaveAoiButton } from '../../../../_components/SavedAoiControls';
import { useSearchContext } from '../../_context/SearchContext';

type AoiField = 'nwLat' | 'nwLon' | 'seLat' | 'seLon';

const aoiInputStyle = (err: boolean) => ({
    width: '100%',
    height: 34,
    padding: '0 10px',
    fontSize: 12.5,
    borderRadius: 4,
    ...(err
        ? {
              borderColor: 'var(--danger)',
              background: 'color-mix(in srgb, var(--danger) 8%, var(--bg-3))',
          }
        : {}),
});

export function AoiPopover() {
    const {
        aoi,
        aoiBounds,
        aoiOpen,
        setAoiOpen,
        aoiTriggerRef,
        startDrawAoi,
        clearAoi,
        applyManualBbox,
        applySavedAoi,
        setPreviewAoi,
        setFitKey,
        nwInput,
        setNwInput,
        seInput,
        setSeInput,
        aoiErrors,
        clearAllAoiErrors,
    } = useSearchContext();

    const [mounted, setMounted] = useState(false);
    const [popPos, setPopPos] = useState<{ top: number; left: number } | null>(null);
    const popRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 바깥 클릭 / ESC 로 닫기.
    useEffect(() => {
        if (!aoiOpen) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (aoiTriggerRef.current?.contains(t)) return;
            if (popRef.current?.contains(t)) return;
            setAoiOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAoiOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [aoiOpen, aoiTriggerRef, setAoiOpen]);

    // 트리거 기준 위치 계산(화면 경계 보정).
    useLayoutEffect(() => {
        if (!aoiOpen) return;
        const compute = () => {
            const rect = aoiTriggerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const POP_W = 320;
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;
            let left = rect.left;
            if (left + POP_W > viewportW - 8) left = Math.max(8, viewportW - POP_W - 8);
            // 세로 보정 — 팝오버가 길어 화면 아래로 넘치면 위로 뒤집고, 그래도 부족하면 클램프.
            const POP_H = popRef.current?.offsetHeight ?? 460;
            let top = rect.bottom + 6;
            if (top + POP_H > viewportH - 8) {
                const above = rect.top - POP_H - 6;
                top = above >= 8 ? above : Math.max(8, viewportH - POP_H - 8);
            }
            setPopPos({ top, left });
        };
        compute();
        const raf = requestAnimationFrame(compute);
        window.addEventListener('resize', compute);
        window.addEventListener('scroll', compute, true);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', compute);
            window.removeEventListener('scroll', compute, true);
        };
    }, [aoiOpen, aoiTriggerRef]);

    if (!mounted || !aoiOpen || !popPos) return null;

    const setInput = (field: AoiField, v: string) => {
        if (field === 'nwLat') setNwInput((s) => ({ ...s, lat: v }));
        else if (field === 'nwLon') setNwInput((s) => ({ ...s, lon: v }));
        else if (field === 'seLat') setSeInput((s) => ({ ...s, lat: v }));
        else setSeInput((s) => ({ ...s, lon: v }));
        clearAllAoiErrors();
    };

    return createPortal(
        <div
            ref={popRef}
            role="dialog"
            aria-label="AOI 영역 설정"
            style={{
                position: 'fixed',
                top: popPos.top,
                left: popPos.left,
                width: 320,
                padding: 14,
                background: 'var(--bg-2)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
            }}
            className="col gap-3"
        >
            <div className="between" style={{ alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>AOI 영역 설정</span>
                <button
                    type="button"
                    className="btn btn--ghost btn--icon btn--sm"
                    aria-label="닫기"
                    onClick={() => setAoiOpen(false)}
                >
                    <Icon name="x" size={12} />
                </button>
            </div>
            <div className="faint" style={{ fontSize: 11, lineHeight: 1.5 }}>
                지도에서 사각형을 그리거나 좌상단(북서)·우하단(남동) 위경도를 직접 입력하세요.
            </div>
            <button
                type="button"
                className="btn btn--outline-accent btn--sm"
                style={{ width: '100%' }}
                onClick={startDrawAoi}
            >
                <Icon name="square" size={13} /> 지도에 사각형 그리기
            </button>
            <div
                className="row gap-2"
                style={{ paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}
            >
                <SaveAoiButton bounds={aoiBounds} />
                <LoadAoiMenu
                    // Hover: 미리보기 + 해당 AOI 로 지도 fly. 팝오버가 닫히면 원래 AOI 로 복귀.
                    onHover={(a) => {
                        setPreviewAoi((prev) => {
                            if (a) {
                                setFitKey(`preview-${a.id}-${Date.now()}`);
                                return a;
                            }
                            // null — 팝오버가 닫혔다는 신호. 직전에 미리보기 중이었다면 원본 위치로 복귀.
                            if (prev) setFitKey(`back-${Date.now()}`);
                            return null;
                        });
                    }}
                    onApply={(a) => applySavedAoi(a)}
                />
            </div>
            <div className="col gap-2">
                <label className="field-label" style={{ margin: 0 }}>
                    좌상단 (북서)
                </label>
                <div className="row gap-2">
                    <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                        <span className="faint" style={{ fontSize: 10.5 }}>
                            위도 (°N)
                        </span>
                        <input
                            className="input mono tabular"
                            placeholder="예: 36.020"
                            style={aoiInputStyle(aoiErrors.has('nwLat'))}
                            value={nwInput.lat}
                            onChange={(e) => setInput('nwLat', e.target.value)}
                        />
                    </div>
                    <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                        <span className="faint" style={{ fontSize: 10.5 }}>
                            경도 (°E)
                        </span>
                        <input
                            className="input mono tabular"
                            placeholder="예: 129.370"
                            style={aoiInputStyle(aoiErrors.has('nwLon'))}
                            value={nwInput.lon}
                            onChange={(e) => setInput('nwLon', e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <div className="col gap-2">
                <label className="field-label" style={{ margin: 0 }}>
                    우하단 (남동)
                </label>
                <div className="row gap-2">
                    <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                        <span className="faint" style={{ fontSize: 10.5 }}>
                            위도 (°N)
                        </span>
                        <input
                            className="input mono tabular"
                            placeholder="예: 35.500"
                            style={aoiInputStyle(aoiErrors.has('seLat'))}
                            value={seInput.lat}
                            onChange={(e) => setInput('seLat', e.target.value)}
                        />
                    </div>
                    <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                        <span className="faint" style={{ fontSize: 10.5 }}>
                            경도 (°E)
                        </span>
                        <input
                            className="input mono tabular"
                            placeholder="예: 129.500"
                            style={aoiInputStyle(aoiErrors.has('seLon'))}
                            value={seInput.lon}
                            onChange={(e) => setInput('seLon', e.target.value)}
                        />
                    </div>
                </div>
            </div>
            {aoiErrors.size > 0 ? (
                <div style={{ fontSize: 11, color: 'var(--danger)', lineHeight: 1.4 }}>
                    붉게 표시된 입력란을 확인하세요. 좌상단 위도 &gt; 우하단 위도, 좌상단 경도 &lt; 우하단 경도여야
                    합니다.
                </div>
            ) : null}
            <div className="row gap-2" style={{ marginTop: 4 }}>
                <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    style={{ flex: 1 }}
                    onClick={applyManualBbox}
                >
                    좌표로 AOI 적용
                </button>
                {aoi ? (
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                            clearAoi();
                            setAoiOpen(false);
                        }}
                    >
                        AOI 해제
                    </button>
                ) : null}
            </div>
        </div>,
        document.body,
    );
}
