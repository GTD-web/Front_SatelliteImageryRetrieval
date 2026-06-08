'use client';

import { useEffect, useMemo, useState } from 'react';

import { Icon, useToast } from '@/_ui/hifi';

interface Run {
    aoi: string;
    started: string;
    duration: string;
    fetched: number;
    status: 'success' | 'warning' | 'failed';
    err?: string;
}

type Tone = 'success' | 'warning' | 'failed';

interface Notif {
    tone: Tone;
    icon: 'check' | 'clock' | 'x';
    title: string;
    sub: string;
}

const TONE_FG: Record<Tone, string> = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    failed: 'var(--danger)',
};
const TONE_BG: Record<Tone, string> = {
    success: 'var(--success-soft)',
    warning: 'var(--warning-soft)',
    failed: 'var(--danger-soft)',
};

/** 동기화 실행 결과 1건을 상단 티커에 띄울 알림으로 변환. 성공/지연/실패를 모두 표현한다. */
function toNotif(r: Run): Notif {
    if (r.status === 'failed') {
        return { tone: 'failed', icon: 'x', title: `${r.aoi} 동기화 실패`, sub: r.err ?? '오류' };
    }
    if (r.status === 'warning') {
        return { tone: 'warning', icon: 'clock', title: `${r.aoi} 동기화 지연`, sub: '5분 후 자동 재시도' };
    }
    return { tone: 'success', icon: 'check', title: `${r.aoi} 동기화 완료`, sub: `신규 ${r.fetched} Scene` };
}

/**
 * 상단 헤더 좌측의 동기화 알림 티커.
 *
 * 슬롯머신처럼 일정 시간마다 다음 알림으로 회전한다(실패뿐 아니라 성공·지연 알림도 함께 노출).
 * 슬롯이 바뀔 때 `key={idx}`로 내부를 리마운트해 `slotIn` 애니메이션을 재생한다.
 */
function SyncTicker({ notifs }: { notifs: Notif[] }) {
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

const INITIAL: Run[] = [
    { aoi: 'Pohang_coast', started: '09:41:48', duration: '42s', fetched: 6, status: 'success' },
    { aoi: 'Gyeongju_basin', started: '09:30:12', duration: '38s', fetched: 2, status: 'success' },
    { aoi: 'Busan_port', started: '07:42:00', duration: '1m 14s', fetched: 12, status: 'success' },
    { aoi: 'Ulleungdo_full', started: '01:00:00', duration: '22s', fetched: 0, status: 'success' },
    { aoi: 'Gimhae_landslide', started: 'Yesterday 04:00', duration: '—', fetched: 0, status: 'warning' },
    {
        aoi: 'Seoul_metro',
        started: '07:30:00',
        duration: '12s',
        fetched: 0,
        status: 'failed',
        err: 'ESA 503 Service Unavailable',
    },
];

export default function SyncMonitorPage() {
    const toast = useToast();
    const [runs, setRuns] = useState<Run[]>(INITIAL);

    const retry = (aoi: string) => {
        setRuns((prev) =>
            prev.map((r) =>
                r.aoi === aoi
                    ? { ...r, status: 'success' as const, duration: '진행 중…', err: undefined }
                    : r,
            ),
        );
        toast(`${aoi} 재시도 중…`, { tone: 'success' });
        setTimeout(() => {
            setRuns((prev) =>
                prev.map((r) =>
                    r.aoi === aoi
                        ? {
                              ...r,
                              started: new Date().toTimeString().slice(0, 8),
                              duration: '34s',
                              fetched: Math.floor(Math.random() * 8) + 1,
                          }
                        : r,
                ),
            );
            toast(`${aoi} 동기화 완료`, { tone: 'success' });
        }, 2000);
    };
    const retryAll = () => {
        const failed = runs.filter((r) => r.status !== 'success');
        if (failed.length === 0) {
            toast('실패한 작업이 없습니다');
            return;
        }
        failed.forEach((r) => retry(r.aoi));
    };

    const failedCount = runs.filter((r) => r.status === 'failed').length;

    // 상단 티커용 알림 목록. 실패를 앞쪽에 배치해 먼저 노출되게 하고, 성공/지연 알림도 함께 회전시킨다.
    const notifs = useMemo<Notif[]>(() => {
        const order: Record<Tone, number> = { failed: 0, warning: 1, success: 2 };
        return [...runs].sort((a, b) => order[a.status] - order[b.status]).map(toNotif);
    }, [runs]);

    return (
        <div className="col" style={{ flex: 1, minHeight: 0 }}>
            <div className="toolbar">
                <SyncTicker notifs={notifs} />
                <div className="row gap-2" style={{ marginLeft: 'auto', alignItems: 'center' }}>
                    {failedCount > 0 ? (
                        <span className="badge badge--danger">{failedCount} 실패</span>
                    ) : (
                        <span className="badge badge--success">전체 정상</span>
                    )}
                    <button type="button" className="btn btn--sm" onClick={retryAll}>
                        <Icon name="refresh" size={13} /> 전체 재시도
                    </button>
                </div>
            </div>
            <div className="col gap-3" style={{ padding: 24, flex: 1, overflow: 'auto' }}>
                <div className="card">
                    <div className="card__header">
                        <div className="card__title">동기화 이력 (24h)</div>
                        <span className="faint" style={{ fontSize: 12 }}>
                            총 {runs.length}회
                        </span>
                    </div>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>AOI</th>
                                <th>시작</th>
                                <th>소요</th>
                                <th className="num">신규 Scene</th>
                                <th>결과</th>
                                <th style={{ width: 120 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {runs.map((r, i) => (
                                <tr key={i}>
                                    <td>
                                        <span style={{ fontWeight: 500 }}>{r.aoi}</span>
                                    </td>
                                    <td className="mono tabular faint" style={{ fontSize: 12 }}>
                                        {r.started}
                                    </td>
                                    <td className="mono tabular faint" style={{ fontSize: 12 }}>
                                        {r.duration}
                                    </td>
                                    <td className="num mono tabular">{r.fetched}</td>
                                    <td>
                                        {r.status === 'success' ? (
                                            <span className="status status--done">성공</span>
                                        ) : r.status === 'warning' ? (
                                            <span className="status status--pending">지연</span>
                                        ) : (
                                            <div className="col" style={{ gap: 2 }}>
                                                <span className="status status--failed">실패</span>
                                                <span className="mono faint" style={{ fontSize: 11 }}>
                                                    {r.err}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        {r.status !== 'success' ? (
                                            <button
                                                type="button"
                                                className="btn btn--sm"
                                                onClick={() => retry(r.aoi)}
                                            >
                                                <Icon name="refresh" size={12} /> 재시도
                                            </button>
                                        ) : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
