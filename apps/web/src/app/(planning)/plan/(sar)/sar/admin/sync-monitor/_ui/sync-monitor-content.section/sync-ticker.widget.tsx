'use client';

/**
 * 상단 헤더 좌측의 동기화 알림 티커(전광판).
 *
 * 슬롯머신처럼 일정 시간마다 다음 알림으로 회전한다(실패뿐 아니라 성공·지연 알림도 함께 노출).
 * 슬롯이 바뀔 때 key={idx} 로 회전 본문을 리마운트해 slotIn 애니메이션을 재생한다.
 *
 * 레이아웃: [고정 라벨] │ [상태 아이콘 + 제목·배지 / 상세] [시작·소요 메타] [슬롯 인디케이터]
 */
import { useEffect, useState } from 'react';

import { Icon } from '@/_ui/hifi';
import { TONE_BG, TONE_FG, type SyncNotif } from '../../_constants/sync-monitor-tone';

export function SyncTicker({ notifs }: { notifs: SyncNotif[] }) {
    const [slot, setSlot] = useState(0);

    useEffect(() => {
        if (notifs.length <= 1) return;
        const t = setInterval(() => setSlot((s) => s + 1), 3200);
        return () => clearInterval(t);
    }, [notifs.length]);

    if (notifs.length === 0) return null;
    const idx = slot % notifs.length;
    const cur = notifs[idx];
    if (!cur) return null;

    const fg = TONE_FG[cur.tone];

    return (
        <div
            className="row gap-3"
            style={{
                alignItems: 'stretch',
                padding: '7px 10px 7px 14px',
                borderRadius: 8,
                background: TONE_BG[cur.tone],
                border: `1px solid ${fg}`,
                flex: '1 1 480px',
                minWidth: 460,
                maxWidth: 700,
                transition: 'background 280ms ease, border-color 280ms ease',
            }}
            aria-live="polite"
        >
            {/* 고정 라벨 — 회전과 무관하게 컨텍스트(최근 동기화 건수)를 제공 */}
            <div className="col" style={{ gap: 1, justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, color: 'var(--text-secondary)' }}>
                    동기화 알림
                </span>
                <span className="mono faint" style={{ fontSize: 10.5, whiteSpace: 'nowrap' }}>
                    최근 24h · {notifs.length}건
                </span>
            </div>

            <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border-default)', opacity: 0.55 }} />

            {/* 회전 본문 — 슬롯이 바뀔 때 통째로 slotIn 재생 */}
            <div
                key={idx}
                className="row sync-slot-in gap-3"
                style={{ flex: 1, minWidth: 0, alignItems: 'center' }}
            >
                <Icon name={cur.icon} size={17} style={{ color: fg, flexShrink: 0 }} />

                <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                    <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                        <span
                            style={{
                                fontSize: 12.5,
                                fontWeight: 600,
                                color: fg,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {cur.title}
                        </span>
                        <span
                            style={{
                                flexShrink: 0,
                                fontSize: 9.5,
                                fontWeight: 700,
                                lineHeight: 1.4,
                                padding: '0 6px',
                                borderRadius: 999,
                                color: fg,
                                border: `1px solid ${fg}`,
                            }}
                        >
                            {cur.badge}
                        </span>
                    </div>
                    <span
                        className="mono faint"
                        style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                        {cur.sub}
                    </span>
                </div>

                {/* 메타 — 시작 시각 / 소요 시간 */}
                <div className="col" style={{ gap: 2, flexShrink: 0, alignItems: 'flex-end' }}>
                    <span className="mono faint tabular" style={{ fontSize: 10.5, whiteSpace: 'nowrap' }}>
                        시작 {cur.started}
                    </span>
                    <span className="mono faint tabular" style={{ fontSize: 10.5, whiteSpace: 'nowrap' }}>
                        소요 {cur.duration}
                    </span>
                </div>
            </div>

            {/* 슬롯 위치 인디케이터 — 회전 중임을 시각화 */}
            <div className="row gap-1" style={{ alignItems: 'center', flexShrink: 0 }}>
                {notifs.map((_, i) => (
                    <span
                        key={i}
                        style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: i === idx ? fg : 'var(--border-default)',
                            transition: 'background 200ms ease',
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
