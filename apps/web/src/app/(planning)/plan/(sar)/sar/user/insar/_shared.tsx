'use client';

import { type ReactNode } from 'react';

import { InfoTip } from '@/_ui/hifi';

export type AnalysisOrProductType = 'DInSAR' | 'SBAS' | 'PSInSAR';

export const typeBadge = (t: AnalysisOrProductType) =>
    t === 'DInSAR' ? 'badge--info' : t === 'SBAS' ? 'badge--warning' : 'badge--brand2';

export function Section({
    title,
    hint,
    info,
    children,
}: {
    title: string;
    hint?: string;
    info?: string;
    children: ReactNode;
}) {
    return (
        <div
            style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--border-subtle)',
            }}
        >
            <div className="col" style={{ gap: 2, marginBottom: 8 }}>
                <div className="row" style={{ alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{title}</span>
                    {info ? <InfoTip text={info} size={12} /> : null}
                </div>
                {hint ? (
                    <span className="faint" style={{ fontSize: 11, lineHeight: 1.5 }}>
                        {hint}
                    </span>
                ) : null}
            </div>
            {children}
        </div>
    );
}

export function LabeledInput({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <label className="col" style={{ gap: 4, flex: 1 }}>
            <span className="faint" style={{ fontSize: 10.5 }}>
                {label}
            </span>
            <input
                className="input mono tabular"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{ height: 30, fontSize: 12 }}
            />
        </label>
    );
}

export function NumberField({
    label,
    value,
    onChange,
    step,
    min,
    max,
    hint,
    info,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    max?: number;
    hint?: string;
    info?: string;
}) {
    return (
        <div className="col" style={{ gap: 3 }}>
            <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                <span className="row" style={{ alignItems: 'center', gap: 5, flex: 1, fontSize: 11.5 }}>
                    {label}
                    {info ? <InfoTip text={info} size={11} /> : null}
                </span>
                <input
                    type="number"
                    className="input mono tabular"
                    value={value}
                    step={step}
                    min={min}
                    max={max}
                    onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (Number.isFinite(v)) onChange(v);
                    }}
                    style={{ width: 88, height: 28, fontSize: 12 }}
                />
            </div>
            {hint ? (
                <span className="faint" style={{ fontSize: 10.5, lineHeight: 1.45 }}>
                    {hint}
                </span>
            ) : null}
        </div>
    );
}
