'use client';

import type { InsarResultsUI } from '../../../_mocks/insar-results.ui-interface';
import { statsForProduct } from '../../../_constants/insar-results-raster';
import { Section } from '../../../../_shared';

/** 핵심 지표 셀 — 작은 라벨 + 큰 숫자. 시인성을 위해 숫자를 키운다. */
function StatCell({ label, unit, value }: { label: string; unit?: string; value: string }) {
    return (
        <div className="col" style={{ gap: 3, minWidth: 0 }}>
            <span className="faint" style={{ fontSize: 10.5, whiteSpace: 'nowrap' }}>
                {label}
                {unit ? ` (${unit})` : ''}
            </span>
            <span
                className="mono tabular"
                style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.02em' }}
            >
                {value}
            </span>
        </div>
    );
}

/** 선택 산출물의 핵심 지표 섹션 — 2열 그리드의 빅넘버 스탯 (Synspective LDM 패턴). */
export function ProductStatsPanel({ product }: { product: InsarResultsUI.InsarProduct }) {
    const s = statsForProduct(product);
    const stack = product.type !== 'DInSAR';
    /** mm 값 — 양수는 + 를 붙여 융기/침하 방향이 한눈에 보이게. */
    const fmtMm = (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
    return (
        <Section
            title="핵심 지표"
            info={'변위는 LOS(위성 시선 방향) 기준입니다.\n음수 = 침하(위성에서 멀어짐), 양수 = 융기.'}
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 12px' }}>
                <StatCell label="최대 융기" unit="mm" value={fmtMm(s.maxUpMm)} />
                <StatCell label="최대 침하" unit="mm" value={fmtMm(s.maxDownMm)} />
                {stack ? (
                    <>
                        <StatCell label="평균 변위 속도" unit="mm/yr" value={fmtMm(s.avgRateMmYr)} />
                        <StatCell
                            label={product.type === 'PSInSAR' ? 'PS 점 수' : '측정점 수'}
                            value={s.points.toLocaleString()}
                        />
                    </>
                ) : (
                    <>
                        <StatCell label="평균 coherence" value={s.meanCoherence.toFixed(2)} />
                        <StatCell label="유효 픽셀" unit="%" value={s.validPixelPct.toFixed(1)} />
                    </>
                )}
                <StatCell label="면적" unit="km²" value={s.areaKm2.toFixed(2)} />
                <StatCell label="Scene 수" value={String(product.scenes)} />
            </div>
        </Section>
    );
}
