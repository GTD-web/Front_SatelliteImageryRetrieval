'use client';

import { useMemo, useState } from 'react';

import { Icon, Quicklook, useConfirm, useToast } from '@/_ui/hifi';

type FailureKind = 'CDSE_5XX' | 'NAS_FULL' | 'AUTH' | 'CHECKSUM' | 'NETWORK' | 'TIMEOUT';

interface FailedJob {
    id: string;
    scene: string;
    productKind: 'SLC' | 'GRD' | 'OCN' | 'RAW';
    size: string;
    user: string;
    email: string;
    failedAt: string;
    attempts: number;
    kind: FailureKind;
    detail: string;
}

const FAILED_JOBS: FailedJob[] = [
    {
        id: 'job-58805',
        scene: 'S1A_IW_SLC__1SDV_20260410T092505',
        productKind: 'SLC',
        size: '4.0 GB',
        user: '김연구원',
        email: 'kim@ksit.re.kr',
        failedAt: '2026-04-24 07:54',
        attempts: 3,
        kind: 'CDSE_5XX',
        detail: 'CDSE 504 Gateway Timeout — OData token endpoint',
    },
    {
        id: 'job-58791',
        scene: 'S1A_IW_GRDH_1SDV_20260408T211855',
        productKind: 'GRD',
        size: '1.7 GB',
        user: '박지수',
        email: 'park@ksit.re.kr',
        failedAt: '2026-04-24 05:12',
        attempts: 2,
        kind: 'CHECKSUM',
        detail: 'MD5 mismatch — partial download (94%)',
    },
    {
        id: 'job-58772',
        scene: 'S1C_IW_SLC__1SDV_20260405T093122',
        productKind: 'SLC',
        size: '4.3 GB',
        user: '최윤라',
        email: 'choi@univ.ac.kr',
        failedAt: '2026-04-24 04:48',
        attempts: 5,
        kind: 'NAS_FULL',
        detail: 'NAS 잔여 용량 부족 (17.4 TB 한계 초과)',
    },
    {
        id: 'job-58765',
        scene: 'S1A_WV_OCN__2SSV_20260403T141022',
        productKind: 'OCN',
        size: '12 MB',
        user: '이민호',
        email: 'lee@labs.kr',
        failedAt: '2026-04-24 03:21',
        attempts: 1,
        kind: 'AUTH',
        detail: 'CDSE refresh_token expired',
    },
    {
        id: 'job-58758',
        scene: 'S1A_S6_RAW__0SDV_20260402T031244',
        productKind: 'RAW',
        size: '1.1 GB',
        user: '김연구원',
        email: 'kim@ksit.re.kr',
        failedAt: '2026-04-23 23:08',
        attempts: 4,
        kind: 'NETWORK',
        detail: 'TCP reset — CDN edge 노드 ko-1',
    },
];

const KIND_LABEL: Record<FailureKind, string> = {
    CDSE_5XX: 'CDSE 5XX',
    NAS_FULL: 'NAS 용량 부족',
    AUTH: '인증',
    CHECKSUM: '체크섬',
    NETWORK: '네트워크',
    TIMEOUT: '타임아웃',
};

const KIND_TONE: Record<FailureKind, string> = {
    CDSE_5XX: 'badge--warning',
    NAS_FULL: 'badge--danger',
    AUTH: 'badge--warning',
    CHECKSUM: 'badge--warning',
    NETWORK: 'badge--neutral',
    TIMEOUT: 'badge--neutral',
};

const PRODUCT_TONE: Record<FailedJob['productKind'], string> = {
    SLC: 'badge--solid',
    GRD: 'badge--accent',
    OCN: 'badge--neutral',
    RAW: 'badge--neutral',
};

type Filter = '전체' | FailureKind;

export default function FailedDownloadsPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const [jobs, setJobs] = useState<FailedJob[]>(FAILED_JOBS);
    const [filter, setFilter] = useState<Filter>('전체');
    const [q, setQ] = useState('');
    const [sel, setSel] = useState<Set<string>>(new Set());

    const filtered = useMemo(
        () =>
            jobs.filter((j) => {
                if (filter !== '전체' && j.kind !== filter) return false;
                if (!q) return true;
                const t = q.toLowerCase();
                return (
                    j.scene.toLowerCase().includes(t) ||
                    j.email.toLowerCase().includes(t) ||
                    j.user.toLowerCase().includes(t) ||
                    j.id.toLowerCase().includes(t) ||
                    j.detail.toLowerCase().includes(t)
                );
            }),
        [jobs, filter, q],
    );

    const allChecked = filtered.length > 0 && filtered.every((j) => sel.has(j.id));
    const toggleAll = () => (allChecked ? setSel(new Set()) : setSel(new Set(filtered.map((j) => j.id))));
    const toggleOne = (id: string) =>
        setSel((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });

    const retryOne = (id: string) => {
        setJobs((prev) => prev.filter((j) => j.id !== id));
        setSel((prev) => {
            const n = new Set(prev);
            n.delete(id);
            return n;
        });
        toast(`${id} 재시도 큐에 추가됨`, { tone: 'success' });
    };

    const bulkRetry = async () => {
        if (sel.size === 0) return;
        const ok = await confirm({
            title: `${sel.size}건 재시도`,
            body: '선택된 실패 잡을 다운로드 큐에 다시 넣습니다.',
            confirmLabel: '재시도',
        });
        if (!ok) return;
        const count = sel.size;
        setJobs((prev) => prev.filter((j) => !sel.has(j.id)));
        setSel(new Set());
        toast(`${count}건 재시도 큐에 추가됨`, { tone: 'success' });
    };

    const bulkDismiss = async () => {
        if (sel.size === 0) return;
        const ok = await confirm({
            title: `${sel.size}건 무시`,
            body: '선택된 실패 잡을 목록에서 제거합니다. (감사 로그에는 남습니다)',
            confirmLabel: '무시',
            danger: true,
        });
        if (!ok) return;
        const count = sel.size;
        setJobs((prev) => prev.filter((j) => !sel.has(j.id)));
        setSel(new Set());
        toast(`${count}건 처리됨`);
    };

    const kindTabs: [Filter, number][] = [
        ['전체', jobs.length],
        ['CDSE_5XX', jobs.filter((j) => j.kind === 'CDSE_5XX').length],
        ['NAS_FULL', jobs.filter((j) => j.kind === 'NAS_FULL').length],
        ['AUTH', jobs.filter((j) => j.kind === 'AUTH').length],
        ['CHECKSUM', jobs.filter((j) => j.kind === 'CHECKSUM').length],
        ['NETWORK', jobs.filter((j) => j.kind === 'NETWORK').length],
    ];

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <div className="toolbar">
                <input
                    className="input input--search"
                    placeholder="Scene / 사용자 / job-id 검색…"
                    style={{ width: 280 }}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
                <div className="row gap-1">
                    {kindTabs.map(([k, n]) => (
                        <span
                            key={k}
                            className={`chip${filter === k ? ' chip--active' : ''}`}
                            onClick={() => setFilter(k)}
                        >
                            {k === '전체' ? '전체' : KIND_LABEL[k as FailureKind]} {n}
                        </span>
                    ))}
                </div>
                <div className="row gap-2" style={{ marginLeft: 'auto', alignItems: 'center' }}>
                    <span className="badge badge--danger">{jobs.length}건 실패</span>
                    <button type="button" className="btn btn--sm" disabled={sel.size === 0} onClick={bulkDismiss}>
                        <Icon name="x" size={12} /> 무시 {sel.size > 0 ? `(${sel.size})` : ''}
                    </button>
                    <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        disabled={sel.size === 0}
                        onClick={bulkRetry}
                    >
                        <Icon name="refresh" size={12} /> 재시도 {sel.size > 0 ? `(${sel.size})` : ''}
                    </button>
                </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                <div className="card">
                    {filtered.length === 0 ? (
                        <div className="empty" style={{ padding: 60 }}>
                            <div className="empty__icon">✅</div>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                실패한 다운로드가 없습니다
                            </div>
                            <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                                조건에 맞는 잡이 없거나 모두 재시도 처리되었습니다
                            </div>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="checkbox-col">
                                        <input
                                            type="checkbox"
                                            className="checkbox"
                                            checked={allChecked}
                                            onChange={toggleAll}
                                        />
                                    </th>
                                    <th style={{ width: 56 }}>미리보기</th>
                                    <th style={{ width: 64 }}>종류</th>
                                    <th>Scene</th>
                                    <th style={{ width: 110 }}>사유</th>
                                    <th>상세</th>
                                    <th>이름</th>
                                    <th>이메일</th>
                                    <th className="num">용량</th>
                                    <th className="num">재시도</th>
                                    <th>실패 시각</th>
                                    <th style={{ width: 100 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((j) => (
                                    <tr key={j.id} className={sel.has(j.id) ? 'is-selected' : ''}>
                                        <td className="checkbox-col">
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                checked={sel.has(j.id)}
                                                onChange={() => toggleOne(j.id)}
                                            />
                                        </td>
                                        <td>
                                            <Quicklook sceneId={j.scene} size={40} product={j.productKind} />
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${PRODUCT_TONE[j.productKind]}`}
                                                style={{ fontSize: 10 }}
                                            >
                                                {j.productKind}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="col" style={{ gap: 2 }}>
                                                <div className="mono" style={{ fontSize: 11.5 }}>
                                                    {j.scene}
                                                </div>
                                                <div className="mono faint" style={{ fontSize: 11 }}>
                                                    {j.id}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${KIND_TONE[j.kind]}`} style={{ fontSize: 10 }}>
                                                {KIND_LABEL[j.kind]}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className="faint"
                                                style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}
                                            >
                                                {j.detail}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12.5 }}>{j.user}</td>
                                        <td className="mono faint" style={{ fontSize: 11 }}>
                                            {j.email}
                                        </td>
                                        <td className="num tabular mono" style={{ fontSize: 12 }}>
                                            {j.size}
                                        </td>
                                        <td className="num tabular mono" style={{ fontSize: 12 }}>
                                            {j.attempts}
                                        </td>
                                        <td className="mono tabular faint" style={{ fontSize: 11.5 }}>
                                            {j.failedAt}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn--outline-accent btn--sm"
                                                onClick={() => retryOne(j.id)}
                                            >
                                                <Icon name="refresh" size={12} /> 재시도
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
