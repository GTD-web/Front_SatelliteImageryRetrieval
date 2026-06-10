'use client';

/**
 * 분석 요청 사이드바 — 기본은 자동 모드(위치+기간만 받아 추천·진행),
 * 고급(수동) 모드는 "검색 옵션 ↔ scene 선택" 두 탭 + 제출 footer.
 *
 * 모드·탭·호버 등 순수 UI 상태는 이 컴포넌트가 useState 로 보관한다.
 * 폼·선택·추천 등 도메인 상태는 Context 에서 받는다.
 */
import { useState } from 'react';

import { Icon } from '@/_ui/hifi';

import { useInsarRequestContext } from '../../_context/InsarRequestContext';
import { ANALYSIS_META } from '../../_constants/insar-analysis';
import { AdvancedFormPanel } from './advanced-form.panel';
import { AutoRequestPanel } from './auto-request.panel';
import { ScenePicker } from './scene-picker.panel';

export function RequestSidebar() {
    const {
        form,
        updateField,
        setRequestType,
        fieldError,
        submitting,
        availableScenes,
        recommendations,
        selectedSceneIds,
        referenceSceneId,
        dinsarOverlap,
        toggleScene,
        clearScenes,
        selectAllScenes,
        autoExcludeLowQuality,
        hoveredSceneId,
        setHoveredSceneId,
        onAoiHover,
        onAoiApplied,
        씬_선택으로_진행한다,
        InSAR_요청을_제출한다,
        추천으로_제출한다,
        요청을_초기화한다,
    } = useInsarRequestContext();

    const selectedCount = selectedSceneIds.size;
    const availableCount = availableScenes.length;
    const minSel = ANALYSIS_META[form.type].minScenes;
    const ready = selectedCount >= minSel;
    const [sidebarTab, setSidebarTab] = useState<'options' | 'scenes'>('options');
    const [mode, setMode] = useState<'auto' | 'advanced'>('auto');

    // 기본은 자동 모드 — 위치+기간만 받아 추천·진행한다. 정밀 제어는 고급(수동) 모드에서.
    if (mode === 'auto') {
        return (
            <AutoRequestPanel
                form={form}
                onChangeField={updateField}
                fieldError={fieldError}
                submitting={submitting}
                recommendations={recommendations}
                onAoiHover={onAoiHover}
                onAoiApplied={onAoiApplied}
                onAutoSubmit={추천으로_제출한다}
                onOpenAdvanced={() => setMode('advanced')}
            />
        );
    }

    return (
        <>
            {/* 고급(수동) 모드 — 자동 추천으로 복귀 */}
            <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setMode('auto')}
                style={{ margin: '8px 8px 0', alignSelf: 'flex-start' }}
            >
                ← 자동 추천으로
            </button>
            {/* 상단 탭 — 검색 옵션 ↔ scene 선택 */}
            <div
                role="tablist"
                aria-label="요청 사이드바 탭"
                style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-1)',
                    flexShrink: 0,
                    padding: '0 8px',
                    gap: 2,
                }}
            >
                {(
                    [
                        ['options', '검색 옵션'],
                        ['scenes', 'scene 선택'],
                    ] as const
                ).map(([k, label]) => {
                    const active = sidebarTab === k;
                    return (
                        <button
                            key={k}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setSidebarTab(k)}
                            style={{
                                flex: 1,
                                padding: '10px 8px',
                                background: 'none',
                                border: 0,
                                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                                fontWeight: active ? 600 : 500,
                                fontSize: 12.5,
                                cursor: 'pointer',
                                marginBottom: -1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <span>{label}</span>
                            {k === 'scenes' ? (
                                <span
                                    className="mono tabular"
                                    style={{
                                        fontSize: 10.5,
                                        padding: '1px 6px',
                                        borderRadius: 8,
                                        background: ready
                                            ? 'color-mix(in srgb, var(--success) 18%, transparent)'
                                            : 'var(--bg-3)',
                                        color: ready ? 'var(--success)' : 'var(--text-secondary)',
                                        fontWeight: 600,
                                    }}
                                >
                                    {selectedCount}/{minSel}
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </div>

            {/* 검색 옵션 탭 — 폼 */}
            <div
                role="tabpanel"
                aria-hidden={sidebarTab !== 'options'}
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                    display: sidebarTab === 'options' ? 'block' : 'none',
                }}
            >
                <AdvancedFormPanel
                    form={form}
                    onChangeField={updateField}
                    onChangeType={setRequestType}
                    availableCount={availableCount}
                    fieldError={fieldError}
                    onAoiHover={onAoiHover}
                    onAoiApplied={onAoiApplied}
                />
            </div>

            {/* scene 선택 탭 — 폼과 같은 위치에 배치되며 탭으로 토글된다.
                display:none 으로 숨겨도 내부 상태(스크롤, 호버)는 그대로 유지된다. */}
            <div
                role="tabpanel"
                aria-hidden={sidebarTab !== 'scenes'}
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: sidebarTab === 'scenes' ? 'flex' : 'none',
                    flexDirection: 'column',
                }}
            >
                <ScenePicker
                    scenes={availableScenes}
                    selected={selectedSceneIds}
                    onToggle={toggleScene}
                    onSelectAll={selectAllScenes}
                    onClear={clearScenes}
                    onAutoExclude={autoExcludeLowQuality}
                    referenceId={referenceSceneId}
                    analysisType={form.type}
                    dinsarOverlap={dinsarOverlap}
                    hoveredId={hoveredSceneId}
                    onHover={setHoveredSceneId}
                />
            </div>

            {/* 제출 footer */}
            <div
                style={{
                    flexShrink: 0,
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-1)',
                    padding: 12,
                }}
            >
                <div className="between" style={{ marginBottom: 8, fontSize: 11.5 }}>
                    <span className="faint">
                        {form.type === 'DInSAR' ? 'scene 선택' : '스택'}{' '}
                        <span
                            className="mono tabular"
                            style={{
                                color:
                                    fieldError?.field === 'scenes'
                                        ? 'var(--danger)'
                                        : ready
                                          ? 'var(--success)'
                                          : 'var(--text-secondary)',
                            }}
                        >
                            {selectedCount}/{minSel}
                        </span>
                    </span>
                    <span className="faint mono tabular">사용 가능 {availableCount}</span>
                </div>
                <div className="row gap-2">
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={요청을_초기화한다}
                        disabled={submitting}
                    >
                        <Icon name="refresh" size={12} />
                    </button>
                    {sidebarTab === 'options' ? (
                        <button
                            type="button"
                            className="btn btn--primary"
                            style={{ flex: 1 }}
                            onClick={() => {
                                if (씬_선택으로_진행한다()) setSidebarTab('scenes');
                            }}
                        >
                            <Icon name="layers" size={13} /> 이미지 선택
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn--primary"
                            style={{ flex: 1 }}
                            onClick={InSAR_요청을_제출한다}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <span
                                        aria-hidden
                                        style={{
                                            display: 'inline-block',
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            border: '2px solid currentColor',
                                            borderTopColor: 'transparent',
                                            animation: 'spin 0.8s linear infinite',
                                            marginRight: 6,
                                            verticalAlign: '-2px',
                                        }}
                                    />
                                    요청 접수 중…
                                </>
                            ) : (
                                <>
                                    <Icon name="plus" size={13} /> 분석 요청
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
