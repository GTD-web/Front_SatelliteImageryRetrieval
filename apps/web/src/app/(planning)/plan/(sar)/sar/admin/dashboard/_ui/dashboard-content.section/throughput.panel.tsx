'use client';

import { useDashboardContext } from '../../_context/DashboardContext';
import type { DashboardUI } from '../../_mocks/dashboard.ui-interface';
import { RANGE_LABEL, RANGE_BUCKET_LABEL } from '../../_constants/dashboard-labels';

export function ThroughputPanel() {
    const { range, summary } = useDashboardContext();

    return (
        <div className="card">
            <div className="card__header">
                <div>
                    <div className="card__title">처리량 & 큐 적체</div>
                    <div className="card__subtle">
                        {RANGE_LABEL[range]} · {RANGE_BUCKET_LABEL[range]} 단위
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
                <ThroughputChart chart={summary.throughput} />
            </div>
        </div>
    );
}

/** 차트 데이터(bars/linePoints/labels)를 받아 SVG 로 그린다. 좌표 계산은 표현 영역이므로 여기서 처리. */
function ThroughputChart({ chart }: { chart: DashboardUI.ThroughputChart }) {
    const { bars, linePoints, labels } = chart;
    const n = bars.length;
    const stepX = 740 / Math.max(1, n);
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
            {labels.map(({ index, text }) => (
                <text
                    key={index}
                    x={40 + stepX * 0.5 + index * stepX}
                    y="215"
                    fontSize="10"
                    fill="var(--text-tertiary)"
                    fontFamily="var(--font-mono)"
                    textAnchor="middle"
                >
                    {text}
                </text>
            ))}
        </svg>
    );
}
