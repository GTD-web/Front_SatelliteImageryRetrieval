'use client';

/**
 * 분석 요청 — scene 선택 (좌측 사이드바 내부)
 *
 * - DInSAR: 정확히 2장(master/slave). 두 scene 선택 시 시간 간격·coherence(예측)·B⊥ 요약.
 * - SBAS/PSInSAR: opt-out 스택 — 범위 내 전체 포함, 기준 대비 |B⊥| 큰 불량일만 제외.
 */
import { useMemo } from 'react';

import { Icon, InfoTip } from '@/_ui/hifi';

import { typeBadge } from '../../../_shared';
import type { InsarRequestUI } from '../../_mocks/insar-request.ui-interface';
import { ANALYSIS_META, PERP_WARN_M } from '../../_constants/insar-analysis';
import { isLowQualityScene, relPerpBaseline } from '../../_constants/insar-geo';
import { vegState } from '../../_constants/insar-form';

type AvailableScene = InsarRequestUI.AvailableScene;
type AnalysisType = InsarRequestUI.AnalysisType;

interface ScenePickerProps {
    scenes: AvailableScene[];
    selected: Set<string>;
    onToggle: (id: string) => void;
    onSelectAll: () => void;
    onClear: () => void;
    /** SBAS/PSInSAR — 기준 대비 |B⊥| 큰 불량일 일괄 제외(opt-out). */
    onAutoExclude: () => void;
    /** 스택 기준(super-master) scene id — 각 행 B⊥ 를 이 기준 대비로 표시. DInSAR 은 null. */
    referenceId: string | null;
    analysisType: AnalysisType;
    /** DInSAR master/slave 겹침 % — 두 scene 선택 시에만 값. */
    dinsarOverlap: number | null;
    hoveredId: string | null;
    onHover: (id: string | null) => void;
}

export function ScenePicker({
    scenes,
    selected,
    onToggle,
    onSelectAll,
    onClear,
    onAutoExclude,
    referenceId,
    analysisType,
    dinsarOverlap,
    hoveredId,
    onHover,
}: ScenePickerProps) {
    const minScenes = ANALYSIS_META[analysisType].minScenes;
    const ready = selected.size >= minScenes;
    const allSelected =
        analysisType === 'DInSAR'
            ? selected.size === 2 && scenes.length >= 2
            : scenes.length > 0 && selected.size >= scenes.length;

    // 스택 기준 scene 과 그 perpBaseline — 각 scene B⊥ 는 이 값 대비로 계산한다.
    const referenceScene = useMemo(
        () => scenes.find((s) => s.id === referenceId) ?? null,
        [scenes, referenceId],
    );
    const refPerp = referenceScene?.perpBaseline ?? 0;

    // 선택된 scene 들의 baseline 통계.
    const baselineSummary = useMemo(() => {
        if (selected.size < 2) return null;
        const picks = scenes.filter((s) => selected.has(s.id));
        if (picks.length < 2) return null;
        if (analysisType === 'DInSAR' && picks.length === 2) {
            // 처리 전이라 실측 coherence 는 알 수 없다 — 두 지표로 "예측"만 한다:
            //  (1) temporal baseline(ΔT): 12·24일까지 양호, 길수록 시간 탈상관.
            //  (2) 식생 phenology(계절): 봄 leaf-out 전이기를 양쪽에서 가르거나
            //      식생 상태가 다르면 C-band coherence 급락.
            const t0 = new Date(picks[0]!.isoDate).getTime();
            const t1 = new Date(picks[1]!.isoDate).getTime();
            const days = Math.round(Math.abs(t1 - t0) / (24 * 60 * 60 * 1000));
            const v0 = vegState(picks[0]!.isoDate);
            const v1 = vegState(picks[1]!.isoDate);
            const phenologyRisk = v0 === 'transition' || v1 === 'transition' || v0 !== v1;
            const quality = days <= 24 && !phenologyRisk ? 'good' : 'caution';
            // DInSAR 은 master 가 곧 기준 — 페어 B⊥ = 두 scene perpBaseline 차이.
            const perp = Math.abs(picks[0]!.perpBaseline - picks[1]!.perpBaseline);
            return { mode: 'pair' as const, days, quality, perp, phenologyRisk };
        }
        // 스택: 각 scene 의 기준 대비 |B⊥| 분포.
        const abs = picks.map((s) => Math.abs(relPerpBaseline(s, refPerp)));
        const min = Math.min(...abs);
        const max = Math.max(...abs);
        const mean = Math.round(abs.reduce((s, v) => s + v, 0) / abs.length);
        return { mode: 'stack' as const, min, max, mean };
    }, [selected, scenes, analysisType, refPerp]);

    return (
        <div
            style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-1)',
            }}
        >
            <div
                style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    flexShrink: 0,
                }}
            >
                <div className="row gap-2 between" style={{ alignItems: 'center' }}>
                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <span className={`badge ${typeBadge(analysisType)}`} style={{ fontSize: 10 }}>
                            {analysisType}
                        </span>
                        <span className="faint" style={{ fontSize: 11 }}>
                            {scenes.length}개 가용
                        </span>
                    </div>
                    <span
                        className="badge"
                        style={{
                            background: ready
                                ? 'color-mix(in srgb, var(--success) 18%, transparent)'
                                : 'var(--bg-3)',
                            color: ready ? 'var(--success)' : 'var(--text-secondary)',
                            fontSize: 10.5,
                        }}
                    >
                        {selected.size}/{minScenes}
                    </span>
                </div>
                <div className="faint" style={{ fontSize: 10.5, marginTop: 4, lineHeight: 1.4 }}>
                    {analysisType === 'DInSAR'
                        ? '두 scene 선택 시 master/slave 자동 매칭'
                        : `범위 내 ${scenes.length}장이 기본 포함 — 품질 낮은 날짜만 제외하세요${
                              scenes.length - selected.size > 0
                                  ? ` (제외 ${scenes.length - selected.size}장)`
                                  : ''
                          }`}
                </div>
                {analysisType !== 'DInSAR' && referenceScene ? (
                    <div className="faint" style={{ fontSize: 10, marginTop: 3, lineHeight: 1.4 }}>
                        기준 scene{' '}
                        <span className="mono tabular" style={{ color: 'var(--text-secondary)' }}>
                            {referenceScene.date}
                        </span>{' '}
                        · 각 ⊥ 는 기준 대비 (실제 B⊥ 는 백엔드 궤도 계산)
                    </div>
                ) : null}

                {baselineSummary ? (
                    <div
                        className="mono tabular"
                        style={{
                            marginTop: 6,
                            padding: '5px 7px',
                            background: 'var(--bg-2)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 4,
                            fontSize: 10.5,
                            color: 'var(--text-secondary)',
                        }}
                    >
                        {baselineSummary.mode === 'pair' ? (
                            <>
                                <span style={{ color: 'var(--text-tertiary)' }}>시간 간격</span>{' '}
                                <span
                                    style={{
                                        fontWeight: 700,
                                        color:
                                            baselineSummary.quality === 'good'
                                                ? 'var(--success)'
                                                : 'var(--warning)',
                                    }}
                                >
                                    {baselineSummary.days}일
                                </span>{' '}
                                <span style={{ color: 'var(--text-tertiary)' }}>
                                    ·{' '}
                                    {baselineSummary.quality === 'good'
                                        ? 'coherence(예측) 양호'
                                        : baselineSummary.phenologyRisk
                                          ? 'coherence(예측) 주의 · 식생 변화기'
                                          : 'coherence(예측) 주의'}
                                </span>{' '}
                                <span style={{ color: 'var(--text-tertiary)' }}>
                                    · B⊥ {baselineSummary.perp}m
                                </span>{' '}
                                <InfoTip
                                    text={`coherence 는 실측이 아니라 시간 간격(ΔT)과 계절(식생 phenology) 기반 예측입니다.\n실제 값은 간섭도 처리 후에 확인됩니다.`}
                                />
                            </>
                        ) : (
                            <>
                                <span style={{ color: 'var(--text-tertiary)' }}>기준 대비 |B⊥|</span> min{' '}
                                {baselineSummary.min} · mean {baselineSummary.mean} · max{' '}
                                {baselineSummary.max} m
                            </>
                        )}
                    </div>
                ) : null}

                {analysisType === 'DInSAR' && dinsarOverlap !== null
                    ? (() => {
                          const pct = Math.round(dinsarOverlap);
                          const tone =
                              pct >= 90
                                  ? { color: 'var(--success)', label: '동일 track · InSAR 가능' }
                                  : pct >= 70
                                    ? { color: 'var(--warning)', label: '정렬 약간 어긋남' }
                                    : { color: 'var(--danger)', label: 'track 상이 가능 · 확인 필요' };
                          return (
                              <div
                                  className="between"
                                  style={{
                                      marginTop: 6,
                                      padding: '5px 7px',
                                      fontSize: 11,
                                      background: 'var(--bg-2)',
                                      border: `1px solid ${tone.color}`,
                                      borderRadius: 4,
                                      alignItems: 'center',
                                  }}
                              >
                                  <span className="row gap-2" style={{ alignItems: 'center' }}>
                                      <span className="faint">InSAR 적합성</span>
                                      <span style={{ color: tone.color, fontWeight: 600, fontSize: 11 }}>
                                          {tone.label}
                                      </span>
                                      <span className="mono tabular faint" style={{ fontSize: 10 }}>
                                          겹침 {pct}%
                                      </span>
                                  </span>
                                  <InfoTip
                                      text={`InSAR 는 동일 track/slice 의 repeat-pass 페어에서만 가능합니다.\nfootprint 겹침(bbox 근사)은 track 일치의 보조 지표로, 동일 track 이면 보통 ≥90%, 낮으면 track/slice 가 다를 수 있습니다.\n정보용이며 제출은 가능합니다.`}
                                  />
                              </div>
                          );
                      })()
                    : null}
            </div>

            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                {scenes.length === 0 ? (
                    <div className="empty" style={{ padding: 20, fontSize: 11.5 }}>
                        가용 scene 이 없습니다 — AOI · 기간 · 미션을 확인하세요
                    </div>
                ) : (
                    scenes.map((s) => {
                        const isDinsar = analysisType === 'DInSAR';
                        const isSel = selected.has(s.id);
                        const isHov = hoveredId === s.id;
                        const isRef = !isDinsar && s.id === referenceId;
                        // opt-out: SBAS/PSInSAR 은 미선택 = 스택에서 제외된 날짜.
                        const excluded = !isDinsar && !isSel;
                        // 기준 대비 B⊥ (스택). DInSAR 은 기준이 없어 행에 표시하지 않는다.
                        const relPerp = relPerpBaseline(s, refPerp);
                        const lowQ = !isDinsar && isLowQualityScene(s, refPerp);
                        const missionColor = s.mission === 'S1A' ? '#22d3ee' : '#a855f7';
                        // 기준 scene 은 스택에서 항상 포함 — 제외 토글을 막는다.
                        const toggle = isRef ? undefined : () => onToggle(s.id);
                        return (
                            <div
                                key={s.id}
                                onClick={toggle}
                                onMouseEnter={() => onHover(s.id)}
                                onMouseLeave={() => onHover(null)}
                                style={{
                                    padding: '8px 10px',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    background:
                                        isDinsar && isSel
                                            ? 'var(--accent-soft)'
                                            : isHov
                                              ? 'var(--bg-2)'
                                              : undefined,
                                    borderLeft: isSel
                                        ? '3px solid var(--accent)'
                                        : '3px solid transparent',
                                    opacity: excluded ? 0.45 : 1,
                                    cursor: isRef ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={isSel}
                                    disabled={isRef}
                                    onChange={() => toggle?.()}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ flexShrink: 0 }}
                                />
                                <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                                        <span
                                            style={{
                                                fontSize: 9.5,
                                                padding: '0 5px',
                                                height: 14,
                                                lineHeight: '13px',
                                                borderRadius: 3,
                                                background: missionColor + '22',
                                                color: missionColor,
                                                border: `1px solid ${missionColor}55`,
                                                fontFamily: 'var(--font-mono)',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {s.mission}
                                        </span>
                                        <span className="faint mono tabular" style={{ fontSize: 10 }}>
                                            {s.pass}
                                        </span>
                                        <span
                                            className="mono tabular"
                                            style={{ fontSize: 10, color: 'var(--text-secondary)' }}
                                        >
                                            {s.date}
                                        </span>
                                        <span
                                            className="row gap-1"
                                            style={{ marginLeft: 'auto', alignItems: 'center', flexShrink: 0 }}
                                        >
                                            {isRef ? (
                                                <span
                                                    title="스택 기준(super-master) scene — B⊥ 0m, 항상 포함"
                                                    style={{
                                                        fontSize: 9,
                                                        padding: '0 4px',
                                                        height: 14,
                                                        lineHeight: '13px',
                                                        borderRadius: 3,
                                                        background: 'var(--accent-soft)',
                                                        color: 'var(--accent)',
                                                        border: '1px solid var(--accent-border)',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    기준
                                                </span>
                                            ) : null}
                                            {lowQ ? (
                                                <span
                                                    title={`기준 대비 |B⊥| ${Math.abs(relPerp)}m > ${PERP_WARN_M}m — 기하 디코릴레이션 위험`}
                                                    style={{
                                                        fontSize: 9,
                                                        padding: '0 4px',
                                                        height: 14,
                                                        lineHeight: '13px',
                                                        borderRadius: 3,
                                                        background: 'var(--warning-soft)',
                                                        color: 'var(--warning)',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    주의
                                                </span>
                                            ) : null}
                                            {!isDinsar ? (
                                                <span
                                                    className="mono tabular"
                                                    title="기준 scene 대비 perpendicular baseline — 0 에 가까울수록 coherence 양호"
                                                    style={{
                                                        fontSize: 10,
                                                        color: lowQ ? 'var(--warning)' : 'var(--text-tertiary)',
                                                        fontWeight: lowQ ? 600 : 400,
                                                    }}
                                                >
                                                    ⊥{relPerp >= 0 ? '+' : ''}
                                                    {relPerp}m
                                                </span>
                                            ) : null}
                                        </span>
                                    </div>
                                    <div
                                        className="mono"
                                        title={s.id}
                                        style={{
                                            fontSize: 10.5,
                                            fontWeight: isSel ? 600 : 500,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            color: 'var(--text-primary)',
                                            textDecoration: excluded ? 'line-through' : undefined,
                                        }}
                                    >
                                        {s.id}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div
                style={{
                    padding: 8,
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-2)',
                    flexShrink: 0,
                    display: 'flex',
                    gap: 6,
                }}
            >
                <button
                    type="button"
                    className="btn btn--sm"
                    style={{ flex: 1 }}
                    onClick={onSelectAll}
                    disabled={scenes.length === 0 || allSelected}
                >
                    <Icon name="plus" size={11} />{' '}
                    {analysisType === 'DInSAR' ? '첫/마지막 페어' : '전체 포함'}
                </button>
                {analysisType === 'DInSAR' ? (
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={onClear}
                        disabled={selected.size === 0}
                        style={{ flex: '0 0 auto' }}
                    >
                        해제
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={onAutoExclude}
                        disabled={scenes.length === 0}
                        style={{ flex: '0 0 auto' }}
                        title={`기준 대비 |B⊥| > ${PERP_WARN_M}m 인 날짜를 스택에서 자동 제외`}
                    >
                        불량일 제외
                    </button>
                )}
            </div>
        </div>
    );
}
