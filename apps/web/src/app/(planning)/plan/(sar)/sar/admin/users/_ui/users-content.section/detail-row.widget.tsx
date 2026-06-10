'use client';

/** 라벨–값 한 줄 표시. 상세 모달의 기관/연락처/요청일 등에 쓴다. */
export function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="between" style={{ alignItems: 'baseline', gap: 16 }}>
            <span className="faint" style={{ fontSize: 12.5, flexShrink: 0 }}>
                {label}
            </span>
            <span
                className={mono ? 'mono' : undefined}
                style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'right' }}
            >
                {value}
            </span>
        </div>
    );
}
