'use client';

/**
 * AOI 사전 점검 패널 — 무거운 처리 전에 coherence·토지피복·경사를 진단한다.
 * 진단 자체는 공유 유틸(@/_shared/aoi-assess)을 클라이언트에서 호출한다(가벼운 사전검증).
 */
import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/_ui/hifi';
import {
    assessAoi,
    LANDCOVER_META,
    QUALITY_META,
    type AoiAssessment,
    type LandcoverKey,
} from '@/_shared/aoi-assess';

import type { InsarRequestUI } from '../../_mocks/insar-request.ui-interface';
import { parseAoiFromForm } from '../../_constants/insar-form';

type RequestForm = InsarRequestUI.RequestForm;

export function AoiAssessPanel({ form }: { form: RequestForm }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AoiAssessment | null>(null);
    const timerRef = useRef<number | null>(null);

    const aoiKey = `${form.nwLat}|${form.nwLon}|${form.seLat}|${form.seLon}`;
    const prevKeyRef = useRef(aoiKey);
    // AOI 가 바뀌면 이전 진단은 더 이상 유효하지 않으므로 비운다.
    useEffect(() => {
        if (prevKeyRef.current !== aoiKey) {
            prevKeyRef.current = aoiKey;
            setResult(null);
            setLoading(false);
            if (timerRef.current) window.clearTimeout(timerRef.current);
        }
    }, [aoiKey]);
    useEffect(
        () => () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        },
        [],
    );

    const aoiValid = parseAoiFromForm(form) !== null;

    const run = () => {
        const ring = parseAoiFromForm(form);
        if (!ring) return;
        setResult(null);
        setLoading(true);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        // 가벼운 사전검증 호출(POST /aoi/assess) 시뮬레이션.
        timerRef.current = window.setTimeout(() => {
            setResult(assessAoi(ring));
            setLoading(false);
        }, 600);
    };

    return (
        <div className="col gap-2">
            <button
                type="button"
                className="btn btn--sm"
                onClick={run}
                disabled={!aoiValid || loading}
                style={{ width: '100%', justifyContent: 'center' }}
            >
                {loading ? (
                    <>
                        <span
                            aria-hidden
                            style={{
                                display: 'inline-block',
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                border: '2px solid currentColor',
                                borderTopColor: 'transparent',
                                animation: 'spin 0.8s linear infinite',
                                marginRight: 6,
                                verticalAlign: '-2px',
                            }}
                        />
                        진단 중…
                    </>
                ) : (
                    <>
                        <Icon name="shield" size={13} /> AOI 사전 점검 {result ? '다시 실행' : '실행'}
                    </>
                )}
            </button>
            {!aoiValid ? (
                <span className="faint" style={{ fontSize: 11 }}>
                    유효한 AOI 를 먼저 지정하세요.
                </span>
            ) : null}
            {result ? <AssessResult result={result} /> : null}
        </div>
    );
}

function AssessResult({ result }: { result: AoiAssessment }) {
    const q = QUALITY_META[result.quality];
    const pct = (v: number) => Math.round(v * 100);
    const covers: LandcoverKey[] = ['urban', 'forest', 'farmland', 'water'];

    return (
        <div className="col gap-3" style={{ marginTop: 4 }}>
            {/* 품질 요약 */}
            <div
                style={{
                    padding: '8px 10px',
                    border: `1px solid ${q.color}`,
                    borderRadius: 6,
                    background: 'var(--bg-2)',
                }}
            >
                <div className="between" style={{ alignItems: 'center' }}>
                    <span className="row gap-2" style={{ alignItems: 'baseline' }}>
                        <span className="faint" style={{ fontSize: 11 }}>
                            품질
                        </span>
                        <span style={{ fontWeight: 700, color: q.color, fontSize: 13 }}>{q.label}</span>
                    </span>
                    <span className="row gap-2" style={{ alignItems: 'baseline', fontSize: 11 }}>
                        <span className="faint">평균 coherence</span>
                        <span className="mono tabular" style={{ fontWeight: 600 }}>
                            {result.coherenceMean.toFixed(2)}
                        </span>
                    </span>
                </div>
                <div className="faint" style={{ fontSize: 10.5, marginTop: 4 }}>
                    면적 ~{result.areaKm2}km² · 평균 경사 {result.slope.meanDeg}° · 급경사{' '}
                    {pct(result.slope.steepFrac)}%
                </div>
            </div>

            {/* 토지피복 막대 + 범례 */}
            <div className="col gap-1">
                <span className="faint" style={{ fontSize: 11 }}>
                    토지피복
                </span>
                <div
                    style={{
                        display: 'flex',
                        height: 8,
                        borderRadius: 4,
                        overflow: 'hidden',
                        background: 'var(--bg-3)',
                    }}
                >
                    {covers.map((k) =>
                        result.landcover[k] > 0.005 ? (
                            <div
                                key={k}
                                style={{
                                    width: `${result.landcover[k] * 100}%`,
                                    background: LANDCOVER_META[k].color,
                                }}
                                title={`${LANDCOVER_META[k].label} ${pct(result.landcover[k])}%`}
                            />
                        ) : null,
                    )}
                </div>
                <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                    {covers.map((k) => (
                        <span
                            key={k}
                            className="row"
                            style={{ gap: 4, alignItems: 'center', fontSize: 10.5 }}
                        >
                            <span
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 2,
                                    background: LANDCOVER_META[k].color,
                                    flexShrink: 0,
                                }}
                            />
                            <span className="faint">{LANDCOVER_META[k].label}</span>
                            <span className="mono tabular">{pct(result.landcover[k])}%</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* 경고 */}
            {result.warnings.length ? (
                <div className="col gap-1">
                    {result.warnings.map((w, i) => (
                        <div
                            key={i}
                            className="row gap-2"
                            style={{
                                alignItems: 'flex-start',
                                fontSize: 10.5,
                                lineHeight: 1.45,
                                color: 'var(--text-secondary)',
                            }}
                        >
                            <Icon
                                name="info"
                                size={11}
                                style={{ color: 'var(--warning)', marginTop: 1, flexShrink: 0 }}
                            />
                            <span>{w}</span>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
