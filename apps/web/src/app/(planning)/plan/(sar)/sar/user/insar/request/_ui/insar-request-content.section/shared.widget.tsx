'use client';

/** 요청 위저드 공용 소형 위젯 — 기간 프리셋 칩 / 인라인 에러 / 기간 경고 목록. */
import { Icon } from '@/_ui/hifi';

import type { InsarRequestUI } from '../../_mocks/insar-request.ui-interface';
import { DATE_PRESETS, presetRange } from '../../_constants/insar-form';
import type { RangeWarning } from '../../_constants/insar-warnings';

type RequestForm = InsarRequestUI.RequestForm;

/** 검색 페이지와 동일한 기간 프리셋 칩 — 클릭 시 오늘 기준 범위를 적용한다. */
export function DatePresetChips({
    form,
    onChangeField,
}: {
    form: RequestForm;
    onChangeField: <K extends keyof RequestForm>(key: K, value: RequestForm[K]) => void;
}) {
    return (
        <div className="row gap-1" style={{ marginTop: 6, flexWrap: 'wrap' }}>
            {DATE_PRESETS.map((t) => (
                <span
                    key={t}
                    className={`chip${form.datePreset === t ? ' chip--active' : ''}`}
                    style={{ height: 22, fontSize: 11 }}
                    onClick={() => {
                        const [s, e] = presetRange(t);
                        onChangeField('startDate', s);
                        onChangeField('endDate', e);
                        onChangeField('datePreset', t);
                    }}
                >
                    {t}
                </span>
            ))}
        </div>
    );
}

/** 입력 옆에 뜨는 인라인 검증 에러 메시지. */
export function FieldErrorMsg({ show, message }: { show: boolean; message?: string }) {
    if (!show) return null;
    return (
        <div
            className="row gap-2"
            style={{
                alignItems: 'flex-start',
                marginTop: 6,
                fontSize: 11,
                lineHeight: 1.4,
                color: 'var(--danger)',
            }}
        >
            <Icon name="info" size={11} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>{message}</span>
        </div>
    );
}

/** 분석 유형별 기간/가용량 경고 박스 목록. */
export function RangeWarningList({ items }: { items: RangeWarning[] }) {
    if (!items.length) return null;
    return (
        <div className="col gap-2" style={{ marginBottom: 4 }}>
            {items.map((w, i) => {
                const color = w.tone === 'danger' ? 'var(--danger)' : 'var(--warning)';
                return (
                    <div
                        key={i}
                        className="row gap-2"
                        style={{
                            alignItems: 'flex-start',
                            padding: '7px 9px',
                            borderRadius: 6,
                            fontSize: 11,
                            lineHeight: 1.45,
                            background: 'var(--bg-2)',
                            border: `1px solid ${color}`,
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <Icon name="info" size={12} style={{ color, marginTop: 1, flexShrink: 0 }} />
                        <span>{w.text}</span>
                    </div>
                );
            })}
        </div>
    );
}
