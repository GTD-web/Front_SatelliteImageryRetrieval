'use client';

import { useEffect, useMemo, useState } from 'react';

import { Icon, Quicklook, useToast } from '@/_ui/hifi';

type ProductKind = 'SLC' | 'GRD' | 'RAW';
type JobStatus = 'running' | 'queued' | 'done' | 'failed';

interface Job {
    id: string;
    scene: string;
    productKind: ProductKind;
    /** 모든 잡이 NAS 스테이징 진행을 표시 (SLC/GRD/RAW 모두 NAS 저장 예정). */
    status: JobStatus;
    progress: number;
    size: string;
    started: string;
    finished: string;
    eta: string;
    user: string;
}

const INITIAL_JOBS: Job[] = [
    {
        id: 'job-58821',
        scene: 'S1A_IW_GRDH_1SDV_20260418T211515',
        productKind: 'GRD',
        status: 'running',
        progress: 62,
        size: '1.6 GB',
        started: '2026-04-27 09:42',
        finished: '—',
        eta: '3분',
        user: '본인',
    },
    {
        id: 'job-58820',
        scene: 'S1C_IW_SLC__1SDV_20260417T092258',
        productKind: 'SLC',
        status: 'running',
        progress: 34,
        size: '4.1 GB',
        started: '2026-04-27 09:40',
        finished: '—',
        eta: '6분',
        user: '본인',
    },
    {
        id: 'job-58819',
        scene: 'S1A_IW_SLC__1SDV_20260413T212030',
        productKind: 'SLC',
        status: 'queued',
        progress: 0,
        size: '4.3 GB',
        started: '—',
        finished: '—',
        eta: '대기',
        user: '본인',
    },
    {
        id: 'job-58814',
        scene: 'S1A_S6_RAW__0SDV_20260414T031244',
        productKind: 'RAW',
        status: 'queued',
        progress: 0,
        size: '1.1 GB',
        started: '—',
        finished: '—',
        eta: '대기',
        user: '본인',
    },
    {
        id: 'job-58812',
        scene: 'S1A_IW_SLC__1SDV_20260415T093105',
        productKind: 'SLC',
        status: 'done',
        progress: 100,
        size: '4.2 GB',
        started: '2026-04-27 08:15',
        finished: '2026-04-27 08:21',
        eta: '완료',
        user: '본인',
    },
    {
        id: 'job-58810',
        scene: 'S1A_IW_GRDH_1SDV_20260408T211855',
        productKind: 'GRD',
        status: 'done',
        progress: 100,
        size: '1.7 GB',
        started: '2026-04-27 07:32',
        finished: '2026-04-27 07:35',
        eta: '완료',
        user: '본인',
    },
    {
        id: 'job-58808',
        scene: 'S1A_S3_RAW__0SDV_20260406T031018',
        productKind: 'RAW',
        status: 'done',
        progress: 100,
        size: '0.9 GB',
        started: '2026-04-27 07:08',
        finished: '2026-04-27 07:10',
        eta: '완료',
        user: '본인',
    },
    {
        id: 'job-58805',
        scene: 'S1A_IW_SLC__1SDV_20260410T092505',
        productKind: 'SLC',
        status: 'failed',
        progress: 48,
        size: '4.0 GB',
        started: '2026-04-27 07:50',
        finished: '2026-04-27 07:54',
        eta: 'CDSE 504',
        user: '본인',
    },
];

function formatDateTime(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

const STATUS_LABEL: Record<JobStatus, string> = {
    running: '진행중',
    queued: '대기',
    done: '완료',
    failed: '실패',
};

const PRODUCT_TONE: Record<ProductKind, string> = {
    SLC: 'badge--solid',
    GRD: 'badge--accent',
    RAW: 'badge--neutral',
};

type KindFilter = 'all' | ProductKind;

/** 진행 시뮬레이션 시 GRD/RAW 는 SLC 보다 빠르게 스테이징 완료된다 (실제 NAS 복사 속도 차이 반영). */
const PROGRESS_STEP: Record<ProductKind, number> = {
    SLC: 2,
    GRD: 5,
    RAW: 6,
};

/** 동시 NAS 스테이징 슬롯 수 — 잡 종류 무관 공용 큐. */
const MAX_PARALLEL_STAGING = 3;

export default function DownloadsPage() {
    const toast = useToast();
    const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
    const [kind, setKind] = useState<KindFilter>('all');

    // NAS 스테이징 진행 시뮬레이션 — 모든 product 종류에 동일 로직 적용
    useEffect(() => {
        const t = setInterval(() => {
            setJobs((prev) =>
                prev.map((j) => {
                    if (j.status !== 'running') return j;
                    const step = PROGRESS_STEP[j.productKind] ?? 2;
                    const next = Math.min(100, j.progress + step + Math.floor(Math.random() * 3));
                    if (next >= 100) {
                        return {
                            ...j,
                            progress: 100,
                            status: 'done',
                            eta: '완료',
                            finished: formatDateTime(new Date()),
                        };
                    }
                    const remaining = Math.round(((100 - next) / Math.max(1, step)) * 0.6);
                    return { ...j, progress: next, eta: `${remaining}분` };
                }),
            );
        }, 1200);
        return () => clearInterval(t);
    }, []);

    // 큐에서 대기 잡을 슬롯이 비면 시작
    const runningCount = jobs.filter((j) => j.status === 'running').length;
    useEffect(() => {
        setJobs((prev) => {
            const running = prev.filter((j) => j.status === 'running').length;
            if (running >= MAX_PARALLEL_STAGING) return prev;
            const idx = prev.findIndex((j) => j.status === 'queued');
            if (idx < 0) return prev;
            const next = [...prev];
            const job = next[idx];
            if (!job) return prev;
            next[idx] = {
                ...job,
                status: 'running',
                started: formatDateTime(new Date()),
                progress: 3,
                eta: '시작',
            };
            return next;
        });
        // runningCount 가 바뀔 때(=잡 1개가 done/failed로 빠질 때)마다 슬롯을 다시 채움
    }, [runningCount]);

    const filtered = useMemo(
        () => (kind === 'all' ? jobs : jobs.filter((j) => j.productKind === kind)),
        [jobs, kind],
    );

    // 푸터 요약 통계
    const totals = useMemo(() => {
        const total = filtered.length;
        const done = filtered.filter((j) => j.status === 'done').length;
        const running = filtered.filter((j) => j.status === 'running').length;
        const queued = filtered.filter((j) => j.status === 'queued').length;
        const failed = filtered.filter((j) => j.status === 'failed').length;
        const totalGb = filtered.reduce((a, j) => a + parseFloat(j.size), 0);
        return { total, done, running, queued, failed, totalGb };
    }, [filtered]);

    const kindTabs: [KindFilter, string, number][] = [
        ['all', '전체', jobs.length],
        ['SLC', 'SLC', jobs.filter((j) => j.productKind === 'SLC').length],
        ['GRD', 'GRD', jobs.filter((j) => j.productKind === 'GRD').length],
        ['RAW', 'RAW', jobs.filter((j) => j.productKind === 'RAW').length],
    ];

    const retry = (id: string) => {
        setJobs((prev) =>
            prev.map((j) =>
                j.id === id
                    ? { ...j, status: 'queued' as JobStatus, progress: 0, eta: '대기', started: '—' }
                    : j,
            ),
        );
        toast('재시도 대기열에 추가됨', { tone: 'success' });
    };
    const downloadFromNas = (j: Job) =>
        toast(`${j.scene.slice(0, 30)} NAS → 로컬 다운로드 시작`, { tone: 'success' });

    return (
        // 상단 toolbar(고정) + 본문(flex:1 카드) — 카드 푸터는 페이지 하단에 sticky 처럼 붙는다.
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <div className="toolbar">
                <div className="row gap-1">
                    {kindTabs.map(([k, lbl, n]) => (
                        <span
                            key={k}
                            className={`chip${kind === k ? ' chip--active' : ''}`}
                            onClick={() => setKind(k)}
                        >
                            {lbl} {n}
                        </span>
                    ))}
                </div>
                <div className="row gap-2" style={{ marginLeft: 'auto', alignItems: 'center' }}>
                    <span className="badge badge--success">
                        <span className="dot" />
                        실시간
                    </span>
                    <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => toast('새로고침됨')}
                        aria-label="새로고침"
                    >
                        <Icon name="refresh" size={13} />
                    </button>
                </div>
            </div>

            {/*
              카드 1개가 본문 전체를 차지하도록 flex:1 로 두고, 내부를
              header(0) + body(1, overflow:auto) + footer(0)로 분할.
              → 잡이 적어도 카드/푸터가 페이지 하단까지 붙어 빈 여백이 줄어든다.
            */}
            <div style={{ flex: 1, minHeight: 0, padding: 16, display: 'flex' }}>
                <div
                    className="card"
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                >
                    <div
                        className="row between"
                        style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border-subtle)',
                            flexShrink: 0,
                        }}
                    >
                        <div className="row gap-2" style={{ alignItems: 'baseline' }}>
                            <strong style={{ fontSize: 13 }}>다운로드 잡</strong>
                            <span className="faint" style={{ fontSize: 12 }}>
                                {filtered.length}건 {kind === 'all' ? '' : `· ${kind} 필터`}
                            </span>
                        </div>
                        <span className="faint" style={{ fontSize: 11.5 }}>
                            SLC · GRD · RAW 전 종류 NAS 스테이징 후 제공
                        </span>
                    </div>

                    <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                        {filtered.length === 0 ? (
                            <div className="empty" style={{ padding: 60 }}>
                                <div className="empty__icon">📭</div>
                                <div>다운로드 잡이 없습니다</div>
                            </div>
                        ) : (
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 56 }}>미리보기</th>
                                        <th>Scene</th>
                                        <th>상태</th>
                                        <th style={{ width: 220 }}>NAS 진행</th>
                                        <th className="num">용량</th>
                                        <th>시작</th>
                                        <th>종료</th>
                                        <th>ETA</th>
                                        <th style={{ width: 140 }}>다운로드</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((j) => (
                                        <tr key={j.id}>
                                            <td>
                                                <Quicklook sceneId={j.scene} size={42} product={j.productKind} />
                                            </td>
                                            <td>
                                                <div className="row gap-2">
                                                    <span
                                                        className={`badge ${PRODUCT_TONE[j.productKind]}`}
                                                        style={{ fontSize: 10 }}
                                                    >
                                                        {j.productKind}
                                                    </span>
                                                    <div
                                                        className="mono"
                                                        style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}
                                                    >
                                                        {j.scene}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status status--${j.status}`}>
                                                    {STATUS_LABEL[j.status]}
                                                </span>
                                            </td>
                                            <td>
                                                {j.status === 'done' ? (
                                                    <div className="row gap-2">
                                                        <div
                                                            className="progress progress--success"
                                                            style={{ flex: 1 }}
                                                        >
                                                            <div
                                                                className="progress__fill"
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <span
                                                            className="mono tabular"
                                                            style={{
                                                                fontSize: 11.5,
                                                                minWidth: 32,
                                                                textAlign: 'right',
                                                            }}
                                                        >
                                                            100%
                                                        </span>
                                                    </div>
                                                ) : j.status === 'failed' ? (
                                                    <div className="progress progress--danger">
                                                        <div
                                                            className="progress__fill"
                                                            style={{ width: `${j.progress}%` }}
                                                        />
                                                    </div>
                                                ) : j.status === 'queued' ? (
                                                    <span className="faint" style={{ fontSize: 12 }}>
                                                        대기
                                                    </span>
                                                ) : (
                                                    <div className="row gap-2">
                                                        <div className="progress" style={{ flex: 1 }}>
                                                            <div
                                                                className="progress__fill"
                                                                style={{ width: `${j.progress}%` }}
                                                            />
                                                        </div>
                                                        <span
                                                            className="mono tabular"
                                                            style={{
                                                                fontSize: 11.5,
                                                                minWidth: 32,
                                                                textAlign: 'right',
                                                            }}
                                                        >
                                                            {j.progress}%
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="num tabular mono" style={{ fontSize: 12 }}>
                                                {j.size}
                                            </td>
                                            <td className="mono tabular faint" style={{ fontSize: 12 }}>
                                                {j.started}
                                            </td>
                                            <td className="mono tabular faint" style={{ fontSize: 12 }}>
                                                {j.finished}
                                            </td>
                                            <td
                                                className={j.status === 'failed' ? '' : 'mono tabular'}
                                                style={{
                                                    fontSize: 12,
                                                    color: j.status === 'failed' ? 'var(--danger)' : undefined,
                                                }}
                                            >
                                                {j.eta}
                                            </td>
                                            <td>
                                                <div className="row gap-1">
                                                    {j.status === 'done' ? (
                                                        <button
                                                            type="button"
                                                            className="btn btn--outline-accent btn--sm"
                                                            onClick={() => downloadFromNas(j)}
                                                        >
                                                            <Icon name="download" size={12} /> 받기
                                                        </button>
                                                    ) : null}
                                                    {j.status === 'failed' ? (
                                                        <button
                                                            type="button"
                                                            className="btn btn--sm"
                                                            onClick={() => retry(j.id)}
                                                        >
                                                            <Icon name="refresh" size={12} /> 재시도
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* 카드 푸터 — 페이지 하단에 고정 (카드가 flex:1 이므로 카드의 바닥에 붙는다) */}
                    <div
                        className="row between"
                        style={{
                            padding: '10px 16px',
                            borderTop: '1px solid var(--border-subtle)',
                            background: 'var(--bg-2)',
                            flexShrink: 0,
                            fontSize: 12,
                            alignItems: 'center',
                            gap: 16,
                            flexWrap: 'wrap',
                        }}
                    >
                        <div className="row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className="row gap-1" style={{ alignItems: 'center' }}>
                                <span className="faint">총</span>
                                <span className="mono tabular" style={{ fontWeight: 600 }}>
                                    {totals.total}
                                </span>
                                <span className="faint">건</span>
                            </span>
                            <span className="faint">·</span>
                            <span className="row gap-1" style={{ alignItems: 'center' }}>
                                <span className="dot" style={{ background: 'var(--info)' }} />
                                <span className="faint">진행</span>
                                <span className="mono tabular">{totals.running}</span>
                            </span>
                            <span className="row gap-1" style={{ alignItems: 'center' }}>
                                <span className="dot" style={{ background: 'var(--warning)' }} />
                                <span className="faint">대기</span>
                                <span className="mono tabular">{totals.queued}</span>
                            </span>
                            <span className="row gap-1" style={{ alignItems: 'center' }}>
                                <span className="dot" style={{ background: 'var(--success)' }} />
                                <span className="faint">완료</span>
                                <span className="mono tabular">{totals.done}</span>
                            </span>
                            {totals.failed > 0 ? (
                                <span className="row gap-1" style={{ alignItems: 'center' }}>
                                    <span className="dot" style={{ background: 'var(--danger)' }} />
                                    <span className="faint">실패</span>
                                    <span
                                        className="mono tabular"
                                        style={{ color: 'var(--danger)', fontWeight: 600 }}
                                    >
                                        {totals.failed}
                                    </span>
                                </span>
                            ) : null}
                        </div>
                        <div className="row gap-3" style={{ alignItems: 'center', marginLeft: 'auto' }}>
                            <span className="faint">합계</span>
                            <span className="mono tabular" style={{ fontWeight: 600 }}>
                                {totals.totalGb.toFixed(1)} GB
                            </span>
                            <span className="faint">·</span>
                            <span className="faint">동시 스테이징 슬롯</span>
                            <span className="mono tabular">
                                {totals.running}/{MAX_PARALLEL_STAGING}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
