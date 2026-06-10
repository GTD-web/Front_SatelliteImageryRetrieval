'use client';

/**
 * 자동 설정값 — 분석 유형에 맞춰 자동 적용되는 파라미터를 읽기 전용으로 노출한다.
 * 편광·코히어런스·베이스라인 등은 사용자가 직접 조정하지 않고, 유형 선택만으로 결정된다.
 */
import { Icon, InfoTip } from '@/_ui/hifi';

import { Section } from '../../../_shared';
import type { InsarRequestUI } from '../../_mocks/insar-request.ui-interface';
import { autoParamRows } from '../../_constants/insar-analysis';
import { analysisRangeWarnings } from '../../_constants/insar-warnings';
import { RangeWarningList } from './shared.widget';

type RequestForm = InsarRequestUI.RequestForm;

export function AutoParamsSection({
    form,
    availableCount,
}: {
    form: RequestForm;
    availableCount: number;
}) {
    const rows = autoParamRows(form.type);
    // 기간/가용 scene 수에 따른 경고는 사용자 선택(AOI·기간)에 좌우되므로 그대로 안내한다.
    const warnings = form.type === 'DInSAR' ? [] : analysisRangeWarnings(form, availableCount);
    return (
        <Section
            title="자동 설정값"
            info="분석 유형에 맞춰 권장 파라미터가 자동으로 설정됩니다. 도메인 지식이 없어도 안전한 기본값으로 처리됩니다."
        >
            <div className="col gap-3">
                {warnings.length ? <RangeWarningList items={warnings} /> : null}
                <div
                    style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 6,
                        background: 'var(--bg-2)',
                        overflow: 'hidden',
                    }}
                >
                    {rows.map((r, i) => (
                        <div
                            key={r.label}
                            className="between"
                            style={{
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 10px',
                                borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)',
                            }}
                        >
                            <span
                                className="row"
                                style={{
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: 11.5,
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                {r.label}
                                {r.info ? <InfoTip text={r.info} size={11} /> : null}
                            </span>
                            <span className="mono tabular" style={{ fontSize: 11.5, fontWeight: 600 }}>
                                {r.value}
                            </span>
                        </div>
                    ))}
                </div>
                <div
                    className="row gap-2"
                    style={{
                        alignItems: 'flex-start',
                        fontSize: 10.5,
                        lineHeight: 1.45,
                        color: 'var(--text-tertiary)',
                    }}
                >
                    <Icon name="info" size={11} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span>
                        이 값들은 직접 조정하지 않아도 됩니다. 분석 유형만 고르면 나머지는 자동으로 맞춰집니다.
                    </span>
                </div>
            </div>
        </Section>
    );
}
