'use client';

import { useMemo } from 'react';

import { MAX_PARALLEL_STAGING } from '../../_constants/downloads-labels';
import type { DownloadsUI } from '../../_mocks/downloads.ui-interface';

/**
 * 카드 푸터 요약 — 페이지 하단에 고정 (카드가 flex:1 이므로 카드의 바닥에 붙는다)
 */
export function DownloadsSummary({ jobs }: { jobs: DownloadsUI.Job[] }) {
    const totals = useMemo(() => {
        const total = jobs.length;
        const done = jobs.filter((j) => j.status === 'done').length;
        const running = jobs.filter((j) => j.status === 'running').length;
        const queued = jobs.filter((j) => j.status === 'queued').length;
        const failed = jobs.filter((j) => j.status === 'failed').length;
        const totalGb = jobs.reduce((a, j) => a + parseFloat(j.size), 0);
        return { total, done, running, queued, failed, totalGb };
    }, [jobs]);

    return (
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
                        <span className="mono tabular" style={{ color: 'var(--danger)', fontWeight: 600 }}>
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
    );
}
