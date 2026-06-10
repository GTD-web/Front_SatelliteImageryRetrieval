'use client';

/**
 * 고급(수동) 모드 — "검색 옵션" 탭 폼.
 * 위성 플랫폼 / 분석 유형 / 자동 설정값 / 분석 이름·기간 / AOI / AOI 사전 점검.
 */
import { DateRangePicker, Icon } from '@/_ui/hifi';
import type { SavedAoi } from '@/_shared/contexts/SavedAoisContext';

import { LoadAoiMenu, SaveAoiButton } from '../../../../../_components/SavedAoiControls';
import { LabeledInput, Section, typeBadge } from '../../../_shared';
import type { InsarRequestUI } from '../../_mocks/insar-request.ui-interface';
import { ANALYSIS_META } from '../../_constants/insar-analysis';
import { AoiAssessPanel } from './aoi-assess.panel';
import { AutoParamsSection } from './auto-params.panel';
import { DatePresetChips, FieldErrorMsg } from './shared.widget';

type RequestForm = InsarRequestUI.RequestForm;
type AnalysisType = InsarRequestUI.AnalysisType;
type FieldError = InsarRequestUI.FieldError;

export function AdvancedFormPanel({
    form,
    onChangeField,
    onChangeType,
    availableCount,
    fieldError,
    onAoiHover,
    onAoiApplied,
}: {
    form: RequestForm;
    onChangeField: <K extends keyof RequestForm>(key: K, value: RequestForm[K]) => void;
    onChangeType: (t: AnalysisType) => void;
    availableCount: number;
    fieldError: FieldError | null;
    onAoiHover: (aoi: SavedAoi | null) => void;
    onAoiApplied: (aoi: SavedAoi) => void;
}) {
    return (
        <>
            <Section title="위성 플랫폼">
                <div className="col gap-2">
                    <select
                        className="input"
                        aria-label="위성 플랫폼 선택"
                        style={{ width: '100%', height: 36, padding: '0 10px', fontSize: 13 }}
                        value={form.platform}
                        onChange={(e) => onChangeField('platform', e.target.value as RequestForm['platform'])}
                    >
                        <option value="S1">Sentinel-1 (C-band SAR)</option>
                        <option value="NISAR">NISAR (L-band SAR)</option>
                    </select>
                    {form.platform === 'S1' ? (
                        <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                            <span
                                className={`chip${form.s1a ? ' chip--active' : ''}`}
                                onClick={() => onChangeField('s1a', !form.s1a)}
                            >
                                Sentinel-1A
                            </span>
                            <span
                                className={`chip${form.s1c ? ' chip--active' : ''}`}
                                onClick={() => onChangeField('s1c', !form.s1c)}
                            >
                                Sentinel-1C
                            </span>
                        </div>
                    ) : (
                        <div className="faint" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                            NISAR 단일 위성 · L-band(24cm) RSLC · 12일 재방문. repeat-pass InSAR 에
                            L-band 를 사용합니다.
                        </div>
                    )}
                    <FieldErrorMsg show={fieldError?.field === 'mission'} message={fieldError?.message} />
                </div>
            </Section>

            <Section title="분석 유형">
                <div className="col gap-2">
                    {(Object.keys(ANALYSIS_META) as AnalysisType[]).map((t) => {
                        const meta = ANALYSIS_META[t];
                        const active = form.type === t;
                        return (
                            <div
                                key={t}
                                onClick={() => onChangeType(t)}
                                style={{
                                    padding: '10px 12px',
                                    border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-default)'}`,
                                    borderRadius: 6,
                                    background: active ? 'var(--accent-soft)' : 'var(--bg-2)',
                                    cursor: 'pointer',
                                }}
                            >
                                <div className="row gap-2" style={{ alignItems: 'center' }}>
                                    <span
                                        style={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            border: `3px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                                            background: active ? '#fff' : 'transparent',
                                            flexShrink: 0,
                                        }}
                                    />
                                    <span style={{ fontWeight: 600, fontSize: 12.5 }}>{meta.label}</span>
                                    <span className={`badge ${typeBadge(t)}`} style={{ fontSize: 10 }}>
                                        {t}
                                    </span>
                                </div>
                                <div className="faint" style={{ fontSize: 11, lineHeight: 1.4, marginTop: 4 }}>
                                    {meta.sub}
                                </div>
                                <div
                                    style={{
                                        marginTop: 6,
                                        fontSize: 10.5,
                                        color: active ? 'var(--accent)' : 'var(--text-tertiary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    <Icon name="square" size={9} style={{ opacity: 0.7 }} />
                                    필요 {meta.sceneRequirement}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Section>

            <AutoParamsSection form={form} availableCount={availableCount} />

            {/* 분석 이름 / 기간 — 각각 한 행씩 세로로 구분 */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="col gap-3">
                    <div className="col gap-2" style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>분석 이름</span>
                        <input
                            className="input"
                            value={form.name}
                            placeholder="예: Pohang 2026Q1"
                            onChange={(e) => onChangeField('name', e.target.value)}
                            style={{
                                width: '100%',
                                ...(fieldError?.field === 'name' ? { borderColor: 'var(--danger)' } : null),
                            }}
                        />
                        <FieldErrorMsg show={fieldError?.field === 'name'} message={fieldError?.message} />
                    </div>
                    <div className="col gap-2" style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>기간</span>
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
                    </div>
                </div>
            </div>

            <Section
                title="AOI (관심 영역)"
                hint="WGS84 위경도. 지도에서 그리거나 라이브러리에서 불러올 수 있습니다."
            >
                <div className="col gap-2">
                    <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                        <SaveAoiButton
                            bounds={(() => {
                                const nlat = parseFloat(form.nwLat);
                                const nlon = parseFloat(form.nwLon);
                                const slat = parseFloat(form.seLat);
                                const slon = parseFloat(form.seLon);
                                if (![nlat, nlon, slat, slon].every(Number.isFinite)) return null;
                                if (nlat <= slat || slon <= nlon) return null;
                                return { nwLat: nlat, nwLon: nlon, seLat: slat, seLon: slon };
                            })()}
                        />
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
                        <LabeledInput
                            label="NW lat"
                            value={form.nwLat}
                            onChange={(v) => onChangeField('nwLat', v)}
                        />
                        <LabeledInput
                            label="NW lon"
                            value={form.nwLon}
                            onChange={(v) => onChangeField('nwLon', v)}
                        />
                    </div>
                    <div className="row gap-2">
                        <LabeledInput
                            label="SE lat"
                            value={form.seLat}
                            onChange={(v) => onChangeField('seLat', v)}
                        />
                        <LabeledInput
                            label="SE lon"
                            value={form.seLon}
                            onChange={(v) => onChangeField('seLon', v)}
                        />
                    </div>
                    <FieldErrorMsg show={fieldError?.field === 'aoi'} message={fieldError?.message} />
                </div>
            </Section>

            <Section
                title="AOI 사전 점검"
                hint="무거운 처리 전에 coherence·토지피복·경사를 진단하고 방법을 추천합니다."
            >
                <AoiAssessPanel form={form} />
            </Section>

            {/* 산출 레이어는 분석 시 전부 생성된다. 어떤 레이어를 볼지는 결과 조회 화면에서 전환한다.
                요청 단계에서는 선택을 받지 않는다. */}
        </>
    );
}
