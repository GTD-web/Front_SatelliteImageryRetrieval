'use client';

/** 검색 화면 공용 작은 위젯 — 구분선, 통계, 결과 facet 칩 등. */
import type { ReactNode } from 'react';

export function FilterDivider() {
    return (
        <hr
            style={{
                border: 0,
                height: 1,
                background: 'var(--border-subtle)',
                margin: 0,
            }}
        />
    );
}

export function Sep() {
    return (
        <span className="faint" style={{ fontSize: 12, opacity: 0.4 }}>
            |
        </span>
    );
}

export function CompactStat({
    label,
    value,
    sub,
    tone,
    mono,
}: {
    label: string;
    value: string;
    sub?: string;
    tone?: 'success' | 'warning';
    mono?: boolean;
}) {
    const color =
        tone === 'success' ? 'var(--success)' : tone === 'warning' ? 'var(--warning)' : 'var(--text-primary)';
    return (
        <span className="row" style={{ gap: 6, alignItems: 'baseline' }}>
            <span className="faint" style={{ fontSize: 11 }}>
                {label}
            </span>
            <span
                className={mono ? 'mono tabular' : 'tabular'}
                style={{ fontSize: mono ? 12 : 14, fontWeight: 600, color }}
            >
                {value}
            </span>
            {sub ? (
                <span className="faint mono tabular" style={{ fontSize: 11 }}>
                    · {sub}
                </span>
            ) : null}
        </span>
    );
}

export function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
    return (
        <span className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="faint" style={{ fontSize: 11 }}>
                {label}
            </span>
            {children}
        </span>
    );
}

export function FilterChip({
    active,
    label,
    n,
    onClick,
}: {
    active: boolean;
    label: string;
    n: number;
    onClick: () => void;
}) {
    return (
        <span
            className={`chip${active ? ' chip--active' : ''}`}
            style={{ height: 22, fontSize: 11, opacity: n === 0 ? 0.5 : 1 }}
            onClick={onClick}
        >
            {label}
            <span className="mono tabular" style={{ marginLeft: 4, fontSize: 10.5, opacity: 0.7 }}>
                {n}
            </span>
        </span>
    );
}
