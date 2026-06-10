'use client';

/**
 * 내 다운로드 화면 레이아웃
 *
 * 상단 toolbar(고정) + 본문(flex:1 카드) — 카드는 header(0) + body(1, overflow:auto) + footer(0)
 * 로 분할되어, 잡이 적어도 카드/푸터가 페이지 하단까지 붙는다.
 */
import { useMemo } from 'react';

import { useDownloadsContext } from '../../_context/DownloadsContext';
import { DownloadsToolbar } from './downloads-toolbar.module';
import { DownloadsTable } from './downloads-table.module';
import { DownloadsSummary } from './downloads-summary.widget';

export function DownloadsContent() {
    const { jobs, kind } = useDownloadsContext();

    const filtered = useMemo(
        () => (kind === 'all' ? jobs : jobs.filter((j) => j.productKind === kind)),
        [jobs, kind],
    );

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <DownloadsToolbar />

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
                        <DownloadsTable jobs={filtered} />
                    </div>

                    <DownloadsSummary jobs={filtered} />
                </div>
            </div>
        </div>
    );
}
