'use client';

/**
 * 상단 헤더 좌측의 동기화 알림 티커.
 *
 * 슬롯머신처럼 일정 시간마다 다음 알림으로 회전한다(실패뿐 아니라 성공·지연 알림도 함께 노출).
 * 슬롯이 바뀔 때 key={idx} 로 내부를 리마운트해 slotIn 애니메이션을 재생한다.
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

    return (
        <div
            className="row gap-2"
            style={{
                alignItems: 'center',
                padding: '6px 12px',
                borderRadius: 8,
                background: TONE_BG[cur.tone],
                border: `1px solid ${TONE_FG[cur.tone]}`,
                minWidth: 320,
                maxWidth: 380,
                transition: 'background 280ms ease, border-color 280ms ease',
            }}
            aria-live="polite"
        >
            <Icon name={cur.icon} size={16} style={{ color: TONE_FG[cur.tone], flexShrink: 0 }} />
            <div key={idx} className="col sync-slot-in" style={{ gap: 1, flex: 1, minWidth: 0 }}>
                <span
                    style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: TONE_FG[cur.tone],
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {cur.title}
                </span>
                <span
                    className="mono faint"
                    style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                    {cur.sub}
                </span>
            </div>
            {/* 슬롯 위치 인디케이터 — 회전 중임을 시각화 */}
            <div className="row gap-1" style={{ flexShrink: 0 }}>
                {notifs.map((_, i) => (
                    <span
                        key={i}
                        style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: i === idx ? TONE_FG[cur.tone] : 'var(--border-default)',
                            transition: 'background 200ms ease',
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
