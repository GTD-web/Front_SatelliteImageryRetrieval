'use client';

/**
 * 자동 분석 요청 패널 — 위치(AOI)+기간만 받고 가장 적합한 분석을 추천·확인·진행한다.
 * 추천(적합도 평가)은 Context 의 SWR 결과를 그대로 받아 표시한다(여기서 직접 계산하지 않음).
 */
import { useEffect, useState } from 'react';

import { DateRangePicker } from '@/_ui/hifi';
import type { SavedAoi } from '@/_shared/contexts/SavedAoisContext';

import { LoadAoiMenu, SaveAoiButton } from '../../../../../_components/SavedAoiControls';
import { LabeledInput, Section } from '../../../_shared';
import type { InsarRequestUI } from '../../_mocks/insar-request.ui-interface';
import { SUITABILITY_META } from '../../_constants/insar-analysis';
import { AoiAssessPanel } from './aoi-assess.panel';
import { DatePresetChips, FieldErrorMsg } from './shared.widget';

type RequestForm = InsarRequestUI.RequestForm;
type FieldError = InsarRequestUI.FieldError;
type Recommendation = InsarRequestUI.Recommendation;
type AnalysisType = InsarRequestUI.AnalysisType;

export function AutoRequestPanel({
    form,
    onChangeField,
    fieldError,
    submitting,
    recommendations,
    onAoiHover,
    onAoiApplied,
    onAutoSubmit,
    onOpenAdvanced,
}: {
    form: RequestForm;
    onChangeField: <K extends keyof RequestForm>(key: K, value: RequestForm[K]) => void;
    fieldError: FieldError | null;
    submitting: boolean;
    recommendations: Recommendation[] | null;
    onAoiHover: (aoi: SavedAoi | null) => void;
    onAoiApplied: (aoi: SavedAoi) => void;
    onAutoSubmit: (rec: Recommendation) => void;
    onOpenAdvanced: () => void;
}) {
    const [selectedType, setSelectedType] = useState<AnalysisType | null>(null);

    // 평가가 갱신되면 가장 적합한(추천) 기법을 기본 선택한다(사용자가 고른 값이 유효하면 유지).
    useEffect(() => {
        setSelectedType((prev) =>
            prev && recommendations?.some((a) => a.type === prev)
                ? prev
                : (recommendations?.[0]?.type ?? null),
        );
    }, [recommendations]);

    const aoiBounds = (() => {
        const nlat = parseFloat(form.nwLat);
        const nlon = parseFloat(form.nwLon);
        const slat = parseFloat(form.seLat);
        const slon = parseFloat(form.seLon);
        if (![nlat, nlon, slat, slon].every(Number.isFinite)) return null;
        if (nlat <= slat || slon <= nlon) return null;
        return { nwLat: nlat, nwLon: nlon, seLat: slat, seLon: slon };
    })();

    return (
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 14, borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>자동 분석</div>
                <div className="faint" style={{ fontSize: 11.5, lineHeight: 1.5, marginTop: 4 }}>
                    위치와 기간만 정하면 가장 적합한 데이터와 분석 방식을 자동으로 선택해 처리합니다.
                </div>
            </div>

            <Section title="위치 (AOI)" hint="지도에서 그리거나 라이브러리에서 불러옵니다.">
                <div className="col gap-2">
                    <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                        <SaveAoiButton bounds={aoiBounds} />
                        <LoadAoiMenu
                            onHover={onAoiHover}
                            onApply={(a) => {
                                onChangeField('nwLat', a.nwLat.toFixed(4));
                                onChangeField('nwLon', a.nwLon.toFixed(4));
                                onChangeField('seLat', a.seLat.toFixed(4));
                                onChangeField('seLon', a.seLon.toFixed(4));
                                onAoiApplied(a);
                            }}
                        />
                    </div>
                    <div className="row gap-2">
                        <LabeledInput label="NW lat" value={form.nwLat} onChange={(v) => onChangeField('nwLat', v)} />
                        <LabeledInput label="NW lon" value={form.nwLon} onChange={(v) => onChangeField('nwLon', v)} />
                    </div>
                    <div className="row gap-2">
                        <LabeledInput label="SE lat" value={form.seLat} onChange={(v) => onChangeField('seLat', v)} />
                        <LabeledInput label="SE lon" value={form.seLon} onChange={(v) => onChangeField('seLon', v)} />
                    </div>
                    <FieldErrorMsg show={fieldError?.field === 'aoi'} message={fieldError?.message} />
                </div>
            </Section>

            <Section title="기간">
                <DateRangePicker
                    start={form.startDate}
                    end={form.endDate}
                    maxDate={new Date()}
                    onChange={(s, e) => {
                        onChangeField('startDate', s);
                        onChangeField('endDate', e);
                        onChangeField('datePreset', '');
                    }}
                />
                <DatePresetChips form={form} onChangeField={onChangeField} />
            </Section>

            <Section title="AOI 사전 점검" hint="무거운 처리 전에 coherence·토지피복·경사를 진단합니다.">
                <AoiAssessPanel form={form} />
            </Section>

            <div
                style={{
                    flex: '1 0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 14,
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-1)',
                }}
            >
                {recommendations ? (
                    <div className="col gap-2" style={{ flex: 1 }}>
                        <div className="faint" style={{ fontSize: 11, lineHeight: 1.5 }}>
                            분석 기법을 선택하세요 — 현재 위치·기간 데이터 기준 예상 적합도입니다.
                        </div>
                        {recommendations.map((a) => {
                            const sel = selectedType === a.type;
                            const meta = SUITABILITY_META[a.suitability];
                            return (
                                <button
                                    key={a.type}
                                    type="button"
                                    onClick={() => setSelectedType(a.type)}
                                    style={{
                                        textAlign: 'left',
                                        padding: '8px 10px',
                                        borderRadius: 6,
                                        border: `1px solid ${sel ? 'var(--accent)' : 'var(--border-default)'}`,
                                        background: sel ? 'var(--accent-soft)' : 'var(--bg-2)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                                        <span
                                            style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: '50%',
                                                border: `3px solid ${sel ? 'var(--accent)' : 'var(--border-default)'}`,
                                                background: sel ? '#fff' : 'transparent',
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span style={{ fontWeight: 600, fontSize: 12.5 }}>{a.type}</span>
                                        <span
                                            style={{
                                                marginLeft: 'auto',
                                                color: meta.color,
                                                fontWeight: 600,
                                                fontSize: 11,
                                            }}
                                        >
                                            ● {meta.label}
                                        </span>
                                    </div>
                                    <div
                                        className="faint"
                                        style={{ fontSize: 10.5, lineHeight: 1.45, marginTop: 4 }}
                                    >
                                        {a.reason}
                                    </div>
                                    <div className="faint mono tabular" style={{ fontSize: 10, marginTop: 2 }}>
                                        {a.sceneCount}장
                                        {a.perpRange ? ` · |B⊥| ${a.perpRange.min}~${a.perpRange.max}m` : ''}
                                    </div>
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            className="btn btn--primary"
                            style={{ width: '100%', marginTop: 'auto' }}
                            onClick={() => {
                                const chosen = recommendations.find((a) => a.type === selectedType);
                                if (chosen) onAutoSubmit(chosen);
                            }}
                            disabled={submitting || !selectedType}
                        >
                            {submitting ? '처리 시작 중…' : `${selectedType ?? ''} 로 진행하기`}
                        </button>
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            style={{ width: '100%' }}
                            onClick={onOpenAdvanced}
                        >
                            고급 설정 (직접 선택)
                        </button>
                    </div>
                ) : (
                    <div className="col gap-2" style={{ flex: 1 }}>
                        <div className="faint" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                            위치(AOI)와 기간을 설정하면 분석 기법별 예상 적합도가 표시됩니다.
                        </div>
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            style={{ width: '100%', marginTop: 'auto' }}
                            onClick={onOpenAdvanced}
                        >
                            고급 설정 (직접 선택)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
