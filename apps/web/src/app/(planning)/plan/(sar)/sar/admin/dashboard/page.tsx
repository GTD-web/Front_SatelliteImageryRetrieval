'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon, Sparkline, useToast, type IconName } from '@/_ui/hifi';

// ────────────────────────────────────────────────────────────────────────────
// 시간 범위
// ────────────────────────────────────────────────────────────────────────────

type Range = '1h' | '24h' | '7d' | '30d';

const RANGE_LABEL: Record<Range, string> = {
    '1h': '지난 1시간',
    '24h': '지난 24시간',
    '7d': '지난 7일',
    '30d': '지난 30일',
};

/** 모킹된 KPI/이벤트는 범위별 multiplier 로 값/추세를 다르게 시뮬레이션한다. */
const RANGE_MULT: Record<Range, number> = { '1h': 0.06, '24h': 1, '7d': 6.4, '30d': 24.8 };

interface Kpi {
    label: string;
    /** 범위에 따라 값을 계산하는 함수. */
    value: (r: Range, shake: number) => string | number;
    delta: (r: Range) => string;
    tone: 'warning' | 'up' | 'down' | 'neutral';
    unit?: string;
    spark: (r: Range, shake: number) => number[];
}

function buildSpark(seed: number, len = 7, base = 0, amp = 1, shake = 0): number[] {
    const out: number[] = [];
    let s = seed + Math.floor(shake * 1000);
    for (let i = 0; i < len; i++) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const v = base + amp * (0.5 + (s / 0x7fffffff - 0.5) + i / len);
        out.push(+v.toFixed(2));
    }
    return out;
}

const KPIS: Kpi[] = [
    {
        label: '처리량',
        value: (r, sh) => Math.round(284 * RANGE_MULT[r] * (1 + sh * 0.04)),
        delta: (r) =>
            r === '1h' ? '+2 vs 직전 1h' : r === '24h' ? '+12% vs 어제' : r === '7d' ? '+18% vs 지난주' : '+9% vs 지난달',
        tone: 'up',
        unit: 'scenes',
        spark: (r, sh) => buildSpark(101, 7, 220 * RANGE_MULT[r], 80 * RANGE_MULT[r], sh),
    },
    {
        label: '실패율',
        value: (r, sh) => {
            const base = r === '1h' ? 1.4 : r === '24h' ? 2.1 : r === '7d' ? 2.6 : 2.9;
            return (base + sh * 0.4).toFixed(1);
        },
        delta: (r) =>
            r === '1h'
                ? '−0.2%p vs 직전 1h'
                : r === '24h'
                  ? '−0.4%p vs 어제'
                  : r === '7d'
                    ? '+0.1%p vs 지난주'
                    : '−0.3%p vs 지난달',
        tone: 'down',
        unit: '%',
        spark: (r, sh) => buildSpark(202, 7, r === '1h' ? 1 : 2, 1, sh),
    },
    {
        label: 'NAS 사용량',
        value: () => '42.6',
        delta: () => '/ 60 TB',
        tone: 'neutral',
        unit: 'TB',
        spark: (_r, sh) => buildSpark(303, 7, 40, 3, sh),
    },
    {
        label: '활성 사용자',
        value: (r, sh) => {
            const base = r === '1h' ? 12 : r === '24h' ? 38 : r === '7d' ? 142 : 386;
            return Math.round(base * (1 + sh * 0.05));
        },
        delta: (r) => (r === '1h' ? '직전 1h 8명' : r === '24h' ? '어제 35명' : r === '7d' ? '지난주 134명' : '지난달 371명'),
        tone: 'up',
        spark: (r, sh) => buildSpark(404, 7, r === '1h' ? 6 : 30, 8, sh),
    },
];

interface QuickAction {
    icon: IconName;
    label: string;
    count: number;
    tone: 'warning' | 'danger' | 'accent';
    target: string;
}

const QUICK_ACTIONS: QuickAction[] = [
    { icon: 'refresh', label: 'Sync 실패 AOI', count: 3, tone: 'danger', target: '/plan/sar/admin/sync-monitor' },
    { icon: 'users', label: '신규 가입', count: 2, tone: 'accent', target: '/plan/sar/admin/users' },
    { icon: 'activity', label: '실패한 다운로드', count: 5, tone: 'danger', target: '/plan/sar/admin/failed-downloads' },
];

const ALL_EVENTS: [string, string, string, string, Range][] = [
    ['09:42:18', 'DOWNLOAD', 'completed', 'job-58817 · S1A_IW_GRDH_20260418 · 1.7 GB · 김연구원', '1h'],
    ['09:42:02', 'CART', 'submit', 'cart-req-221 · 148 scenes · 박지수', '1h'],
    ['09:41:48', 'SYNC', 'success', 'Pohang_coast · 6 new scenes', '1h'],
    ['09:41:33', 'LOGIN', 'success', 'choi@ksit.re.kr', '1h'],
    ['09:40:55', 'DOWNLOAD', 'running', 'job-58821 · S1A_IW_GRDH_20260418 · 67%', '1h'],
    ['09:40:12', 'DOWNLOAD', 'failed', 'job-58805 · CDSE 504 · 재시도 예약', '24h'],
    ['09:39:28', 'CART', 'submit', '32 scenes · 58.3 GB · lee@labs.kr', '24h'],
    ['09:38:14', 'SYNC', 'success', 'Gyeongju · 2 new scenes', '24h'],
    ['08:32:10', 'INSAR', 'completed', 'pohang-q4 DInSAR · 512 MB', '24h'],
    ['07:18:42', 'USER', 'created', 'yoon@ksit.re.kr (downloader)', '24h'],
    ['어제 22:14', 'DOWNLOAD', 'completed', 'job-58712 · 2.1 GB · 박지수', '7d'],
    ['어제 21:02', 'SYNC', 'failed', 'Seoul_metro · ESA 503', '7d'],
    ['3일 전', 'INSAR', 'completed', 'gyeongju-sbas · 14.2 GB', '7d'],
    ['12일 전', 'ROLE', 'change', 'jung@ksit.re.kr viewer → downloader', '30d'],
    ['22일 전', 'SYSTEM', 'maintenance', 'NAS 정기 점검 완료', '30d'],
];

const STATUS_COLOR: Record<string, string> = {
    completed: 'var(--success)',
    success: 'var(--success)',
    pending: 'var(--warning)',
    running: 'var(--info)',
    failed: 'var(--danger)',
    submit: 'var(--accent)',
    created: 'var(--accent)',
    change: 'var(--info)',
    maintenance: 'var(--text-tertiary)',
};

const NAS_BREAKDOWN: [string, number, string][] = [
    ['S1A / SLC', 18.2, 'var(--accent)'],
    ['S1A / GRD', 12.8, 'var(--brand-2)'],
    ['S1C / SLC', 6.1, 'var(--success)'],
    ['S1C / GRD', 3.4, 'var(--warning)'],
    ['InSAR 산출', 2.1, 'var(--info)'],
];

function rangeWindow(r: Range): Set<Range> {
    // 더 긴 범위는 더 짧은 범위를 포함
    if (r === '1h') return new Set(['1h']);
    if (r === '24h') return new Set(['1h', '24h']);
    if (r === '7d') return new Set(['1h', '24h', '7d']);
    return new Set(['1h', '24h', '7d', '30d']);
}

function formatTime(d: Date) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mi}:${ss}`;
}

export default function AdminDashboardPage() {
    const toast = useToast();
    const router = useRouter();
    const [range, setRange] = useState<Range>('24h');
    /** 새로고침 누적값 — KPI/sparkline/throughput 차트가 살짝 흔들리도록 시드로 사용. */
    const [shake, setShake] = useState(0);
    const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());

    // 클라이언트에서만 최초 시각이 갱신되므로 hydration mismatch 방지용 mount 마커
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const events = useMemo(() => {
        const window = rangeWindow(range);
        return ALL_EVENTS.filter(([, , , , bucket]) => window.has(bucket));
    }, [range]);

    const refresh = () => {
        setShake((s) => s + 1);
        setLastUpdated(new Date());
        toast(`${RANGE_LABEL[range]} 데이터 새로고침됨`, { tone: 'success' });
    };

    return (
        <div className="col" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <div className="toolbar" style={{ justifyContent: 'flex-end', gap: 12 }}>
                <span className="faint mono tabular" style={{ fontSize: 11.5 }}>
                    {mounted ? `갱신 ${formatTime(lastUpdated)}` : ''}
                </span>
                <div className="segmented" role="tablist" aria-label="시간 범위">
                    {(['1h', '24h', '7d', '30d'] as const).map((r) => (
                        <button
                            key={r}
                            type="button"
                            role="tab"
                            aria-selected={range === r}
                            className={range === r ? 'active' : ''}
                            onClick={() => setRange(r)}
                        >
                            {r}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className="btn btn--sm"
                    onClick={refresh}
                    aria-label="새로고침"
                    data-tooltip="새로고침"
                >
                    <Icon name="refresh" size={13} />
                </button>
            </div>
            <div className="col gap-4" style={{ padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {KPIS.map((k) => {
                        const spark = k.spark(range, shake);
                        const value = k.value(range, shake);
                        const delta = k.delta(range);
                        return (
                            <div key={k.label} className="kpi">
                                <div className="between">
                                    <div className="kpi__label">{k.label}</div>
                                    <Sparkline
                                        points={spark}
                                        color={
                                            k.tone === 'warning'
                                                ? 'var(--warning)'
                                                : k.tone === 'up' || k.tone === 'down'
                                                  ? 'var(--success)'
                                                  : 'var(--text-tertiary)'
                                        }
                                    />
                                </div>
                                <div className="kpi__value tabular">
                                    {value}
                                    {k.unit ? (
                                        <span style={{ fontSize: 14, color: 'var(--text-tertiary)', marginLeft: 4 }}>
                                            {k.unit}
                                        </span>
                                    ) : null}
                                </div>
                                <div
                                    className={`kpi__delta ${
                                        k.tone === 'up'
                                            ? 'kpi__delta--up'
                                            : k.tone === 'down'
                                              ? 'kpi__delta--up'
                                              : k.tone === 'warning'
                                                ? 'kpi__delta--down'
                                                : ''
                                    }`}
                                >
                                    {delta}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <div className="card">
                        <div className="card__header">
                            <div>
                                <div className="card__title">처리량 & 큐 적체</div>
                                <div className="card__subtle">
                                    {RANGE_LABEL[range]} · {range === '1h' ? '5분' : range === '24h' ? '15분' : range === '7d' ? '6시간' : '1일'} 단위
                                </div>
                            </div>
                            <div className="row gap-2">
                                <span className="badge badge--accent">
                                    <span className="dot" />
                                    Completed
                                </span>
                                <span className="badge badge--warning">
                                    <span className="dot" />
                                    Queued
                                </span>
                            </div>
                        </div>
                        <div className="card__body" style={{ paddingTop: 8 }}>
                            <ThroughputChart range={range} shake={shake} />
                        </div>
                    </div>

                    <div className="card">
                        <div className="card__header">
                            <div className="card__title">Quick Actions</div>
                        </div>
                        <div className="col" style={{ padding: '4px 0' }}>
                            {QUICK_ACTIONS.map((a) => (
                                <div
                                    key={a.label}
                                    className="between"
                                    style={{
                                        padding: '12px 18px',
                                        borderBottom: '1px solid var(--border-subtle)',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => router.push(a.target)}
                                >
                                    <div className="row gap-3">
                                        <Icon name={a.icon} size={16} style={{ color: `var(--${a.tone})` }} />
                                        <span>{a.label}</span>
                                    </div>
                                    <div className="row gap-2">
                                        <span className={`badge badge--${a.tone}`}>{a.count}</span>
                                        <Icon name="chevronRight" size={12} style={{ color: 'var(--text-tertiary)' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <div className="card" style={{ minHeight: 300 }}>
                        <div className="card__header">
                            <div>
                                <div className="card__title">실시간 이벤트</div>
                                <div className="card__subtle">
                                    WebSocket · {RANGE_LABEL[range]} · {events.length}건
                                </div>
                            </div>
                            <span className="badge badge--success">
                                <span className="dot" />
                                Connected
                            </span>
                        </div>
                        <div
                            className="col"
                            style={{
                                fontSize: 12.5,
                                fontFamily: 'var(--font-mono)',
                                padding: '4px 18px 18px',
                                maxHeight: 280,
                                overflow: 'auto',
                            }}
                        >
                            {events.length === 0 ? (
                                <div className="empty" style={{ padding: 24, fontSize: 12 }}>
                                    이 범위에 표시할 이벤트가 없습니다
                                </div>
                            ) : (
                                events.map(([t, type, status, msg], i) => (
                                    <div
                                        key={i}
                                        className="row gap-3"
                                        style={{
                                            padding: '6px 0',
                                            borderBottom:
                                                i < events.length - 1
                                                    ? '1px dashed var(--border-subtle)'
                                                    : undefined,
                                        }}
                                    >
                                        <span style={{ color: 'var(--text-tertiary)' }}>{t}</span>
                                        <span
                                            className="badge badge--neutral"
                                            style={{ minWidth: 80, justifyContent: 'center' }}
                                        >
                                            {type}
                                        </span>
                                        <span style={{ color: STATUS_COLOR[status] ?? 'var(--text-secondary)', minWidth: 70 }}>
                                            ●&nbsp;&nbsp;{status}
                                        </span>
                                        <span className="truncate" style={{ color: 'var(--text-secondary)', flex: 1 }}>
                                            {msg}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <div className="card__header">
                            <div className="card__title">NAS 사용량 분포</div>
                        </div>
                        <div className="card__body col gap-3">
                            {NAS_BREAKDOWN.map(([k, v, c]) => (
                                <div key={k}>
                                    <div className="between" style={{ fontSize: 12, marginBottom: 4 }}>
                                        <span>{k}</span>
                                        <span className="mono tabular faint">{v} TB</span>
                                    </div>
                                    <div className="progress">
                                        <div
                                            className="progress__fill"
                                            style={{ width: `${(v / 60) * 100}%`, background: c }}
                                        />
                                    </div>
                                </div>
                            ))}
                            <div
                                className="row between"
                                style={{
                                    paddingTop: 8,
                                    borderTop: '1px solid var(--border-subtle)',
                                    fontSize: 12,
                                }}
                            >
                                <span className="faint">합계</span>
                                <span className="mono tabular" style={{ fontWeight: 600 }}>
                                    42.6 / 60 TB
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ThroughputChart({ range, shake }: { range: Range; shake: number }) {
    /** 범위에 따라 bar 개수와 x 축 라벨이 달라지도록 구성. */
    const layout = useMemo(() => {
        if (range === '1h') return { n: 12, labelStep: 3, labelFn: (i: number) => `${i * 5}m` };
        if (range === '24h') return { n: 24, labelStep: 6, labelFn: (i: number) => `${(i + 12) % 24}:00` };
        if (range === '7d') return { n: 7, labelStep: 1, labelFn: (i: number) => `D-${6 - i}` };
        return { n: 30, labelStep: 5, labelFn: (i: number) => `D-${29 - i}` };
    }, [range]);

    const seed = (shake + 1) * 17 + (range === '1h' ? 1 : range === '24h' ? 2 : range === '7d' ? 3 : 4);

    const bars = Array.from({ length: layout.n }).map(
        (_, i) => 30 + Math.sin((i + seed) / 3) * 20 + ((i * 37 + seed * 11) % 30),
    );
    const linePoints = Array.from({ length: layout.n }).map(
        (_, i) => 140 - Math.cos((i + seed) / 4) * 30 - (i > Math.floor(layout.n * 0.7) ? 20 : 0),
    );
    const stepX = 740 / Math.max(1, layout.n);
    const barW = Math.max(3, stepX * 0.5);
    const linePath = linePoints
        .map((y, i) => `${i === 0 ? 'M' : 'L'} ${40 + stepX * 0.5 + i * stepX},${y}`)
        .join(' ');
    return (
        <svg viewBox="0 0 800 240" width="100%" height="220" preserveAspectRatio="none">
            {[0, 1, 2, 3, 4].map((i) => (
                <line
                    key={i}
                    x1="40"
                    y1={30 + i * 40}
                    x2="780"
                    y2={30 + i * 40}
                    stroke="var(--border-subtle)"
                    strokeWidth="1"
                />
            ))}
            {bars.map((h, i) => (
                <rect
                    key={i}
                    x={40 + stepX * 0.5 - barW / 2 + i * stepX}
                    y={190 - h}
                    width={barW}
                    height={h}
                    fill="var(--accent)"
                    opacity="0.85"
                    rx="1"
                />
            ))}
            <path d={linePath} stroke="var(--warning)" strokeWidth="2" fill="none" strokeLinecap="round" />
            {Array.from({ length: Math.ceil(layout.n / layout.labelStep) + 1 }).map((_, k) => {
                const i = Math.min(layout.n - 1, k * layout.labelStep);
                return (
                    <text
                        key={i}
                        x={40 + stepX * 0.5 + i * stepX}
                        y="215"
                        fontSize="10"
                        fill="var(--text-tertiary)"
                        fontFamily="var(--font-mono)"
                        textAnchor="middle"
                    >
                        {layout.labelFn(i)}
                    </text>
                );
            })}
        </svg>
    );
}
