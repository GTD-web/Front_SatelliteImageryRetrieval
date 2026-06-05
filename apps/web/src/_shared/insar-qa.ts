// ────────────────────────────────────────────────────────────────────────────
// InSAR 산출물 신뢰도(QA) — 공유 데이터 · 점수 로직
//
// 18-insar-products.md 배경: DInSAR/SBAS/PSInSAR 산출물은 "겉보기엔 그럴듯한데
// 실제로는 틀린" 경우가 많다. 변위(결과)와 함께 "이 결과를 얼마나 믿을 수
// 있는가"(QA)를 정량화한다. 관리자 분석 품질 화면과 사용자 분석 결과 뷰어가
// 동일한 점수를 쓰도록 이 모듈을 공유한다.
// ────────────────────────────────────────────────────────────────────────────

export type ProductType = 'DInSAR' | 'SBAS' | 'PSInSAR';

export interface QaMetrics {
    /** 평균 코히런스 0~1 — 두 시점이 같은 산란체를 보는 정도 */
    coherence: number;
    /** 시계열 코히런스 0~1 — 전체 기간 동안 얼마나 안정적인가 (SBAS/PS 핵심) */
    temporalCoherence: number;
    /** 언랩 품질 0~1 — residue density·phase 연속성 기반 합성 */
    unwrapQuality: number;
    /** connected component 비율 0~1 — 언랩 신뢰 가능한 영역 비율 */
    connectedRatio: number;
    /** SBAS 네트워크 안정성 0~1 — interferogram 그래프 redundancy (DInSAR 해당없음) */
    networkStability: number;
    /** 대기 영향(APS) 오염도 0~1 — 높을수록 나쁨 */
    apsContamination: number;
    /** 시계열 잔차 RMSE (mm) — 낮을수록 모델이 데이터를 잘 설명 */
    residualMm: number;
    /** 시계열 코히런스 추이 (epoch별) — temporal decorrelation 시각화용 */
    coherenceTrend: number[];
}

export interface QaProduct {
    id: string;
    name: string;
    type: ProductType;
    mission: string;
    range: string;
    processed: string;
    /** LOS 평균 속도 (mm/yr) — 음수는 침하 */
    velocityMmYr: number;
    metrics: QaMetrics;
}

export const QA_PRODUCTS: QaProduct[] = [
    {
        id: 'pohang-q4',
        name: 'Pohang subsidence 2025Q4',
        type: 'DInSAR',
        mission: 'S1A',
        range: '2025-10-01 ~ 2025-12-30',
        processed: '2026-01-15',
        velocityMmYr: -32,
        metrics: {
            coherence: 0.84,
            temporalCoherence: 0.8,
            unwrapQuality: 0.88,
            connectedRatio: 0.93,
            networkStability: 0,
            apsContamination: 0.18,
            residualMm: 1.9,
            coherenceTrend: [0.86, 0.85, 0.84, 0.83, 0.85, 0.84, 0.82, 0.84],
        },
    },
    {
        id: 'gyeongju-sbas',
        name: 'Gyeongju SBAS 2024-2025',
        type: 'SBAS',
        mission: 'S1A',
        range: '2024-01 ~ 2025-12',
        processed: '2026-02-03',
        velocityMmYr: -18,
        metrics: {
            coherence: 0.79,
            temporalCoherence: 0.82,
            unwrapQuality: 0.84,
            connectedRatio: 0.9,
            networkStability: 0.86,
            apsContamination: 0.22,
            residualMm: 2.3,
            coherenceTrend: [0.83, 0.81, 0.82, 0.8, 0.79, 0.82, 0.83, 0.81, 0.8, 0.82, 0.81, 0.82],
        },
    },
    {
        id: 'gimhae',
        name: 'Gimhae 산사태 모니터',
        type: 'DInSAR',
        mission: 'S1A',
        range: '2025-08-12 ~ 2025-08-24',
        processed: '2025-08-25',
        velocityMmYr: -41,
        metrics: {
            // 여름 식생 + 강우 직후 → coherence 붕괴, unwrap island artifact
            coherence: 0.28,
            temporalCoherence: 0.31,
            unwrapQuality: 0.42,
            connectedRatio: 0.51,
            networkStability: 0,
            apsContamination: 0.61,
            residualMm: 7.4,
            coherenceTrend: [0.52, 0.41, 0.33, 0.36, 0.27, 0.24, 0.29, 0.26],
        },
    },
    {
        id: 'busan-ps',
        name: 'Busan Port PSInSAR',
        type: 'PSInSAR',
        mission: 'S1A·S1C',
        range: '2023-01 ~ 2025-12',
        processed: '2026-01-28',
        velocityMmYr: -6,
        metrics: {
            // 도시 영구 산란체 → 매우 안정
            coherence: 0.91,
            temporalCoherence: 0.93,
            unwrapQuality: 0.9,
            connectedRatio: 0.96,
            networkStability: 0.88,
            apsContamination: 0.12,
            residualMm: 1.2,
            coherenceTrend: [0.92, 0.93, 0.91, 0.93, 0.94, 0.92, 0.93, 0.91, 0.93, 0.93, 0.92, 0.93],
        },
    },
    {
        id: 'ulleung',
        name: 'Ulleungdo SBAS',
        type: 'SBAS',
        mission: 'S1A',
        range: '2024-06 ~ 2026-03',
        processed: '2026-04-10',
        velocityMmYr: -23,
        metrics: {
            // 산악 지형 → APS 오염 큼, coherence 중간
            coherence: 0.55,
            temporalCoherence: 0.58,
            unwrapQuality: 0.6,
            connectedRatio: 0.7,
            networkStability: 0.62,
            apsContamination: 0.52,
            residualMm: 4.6,
            coherenceTrend: [0.62, 0.58, 0.55, 0.6, 0.51, 0.57, 0.54, 0.56, 0.53, 0.58, 0.55, 0.56],
        },
    },
];

export function getQaProduct(id: string): QaProduct | undefined {
    return QA_PRODUCTS.find((p) => p.id === id);
}

// ────────────────────────────────────────────────────────────────────────────
// 등급 / 합성 점수
// ────────────────────────────────────────────────────────────────────────────

export type Grade = 'good' | 'usable' | 'risk';

export const GRADE_COLOR: Record<Grade, string> = {
    good: 'var(--success)',
    usable: 'var(--warning)',
    risk: 'var(--danger)',
};
export const GRADE_LABEL: Record<Grade, string> = { good: '양호', usable: '주의', risk: '위험' };

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export interface MetricDef {
    key: keyof QaMetrics;
    label: string;
    info: string;
    /** 값 표시 포맷 */
    fmt: (v: number) => string;
    /** 막대 길이용 0~1 정규화 (값이 좋을수록 1) */
    norm: (v: number) => number;
    grade: (v: number) => Grade;
    /** 등급 기준 설명 */
    rule: string;
    /** DInSAR(단일 페어)에는 해당 없는 지표 */
    skipForDinsar?: boolean;
}

export const METRIC_DEFS: MetricDef[] = [
    {
        key: 'coherence',
        label: '코히런스',
        info: '두 시점이 같은 산란체를 보는 정도(0~1)를 나타냅니다. 1에 가까울수록 위상이 안정적입니다. 식생·강우·시간 경과로 떨어집니다.',
        fmt: (v) => v.toFixed(2),
        norm: (v) => v,
        grade: (v) => (v >= 0.7 ? 'good' : v >= 0.4 ? 'usable' : 'risk'),
        rule: '≥0.7 양호 · 0.4~0.7 주의 · <0.4 위험',
    },
    {
        key: 'temporalCoherence',
        label: '시계열 코히런스',
        info: '전체 관측 기간 동안 픽셀이 얼마나 일관되게 안정적인지를 나타냅니다. PS 후보 판정의 핵심 지표입니다.',
        fmt: (v) => v.toFixed(2),
        norm: (v) => v,
        grade: (v) => (v >= 0.7 ? 'good' : v >= 0.45 ? 'usable' : 'risk'),
        rule: '≥0.7 양호 · 0.45~0.7 주의 · <0.45 위험',
    },
    {
        key: 'unwrapQuality',
        label: '언랩 품질',
        info: 'phase unwrapping(위상 펼침)의 신뢰도입니다. residue density와 phase 연속성으로 합성합니다. 낮으면 2π jump·island artifact 위험이 있습니다.',
        fmt: (v) => v.toFixed(2),
        norm: (v) => v,
        grade: (v) => (v >= 0.75 ? 'good' : v >= 0.5 ? 'usable' : 'risk'),
        rule: '≥0.75 양호 · 0.5~0.75 주의 · <0.5 위험',
    },
    {
        key: 'connectedRatio',
        label: 'Connected 비율',
        info: 'SNAPHU connected component 중 신뢰 가능한 영역의 비율입니다. 낮으면 disconnected island가 많아 부분적으로만 신뢰할 수 있습니다.',
        fmt: (v) => `${Math.round(v * 100)}%`,
        norm: (v) => v,
        grade: (v) => (v >= 0.85 ? 'good' : v >= 0.6 ? 'usable' : 'risk'),
        rule: '≥85% 양호 · 60~85% 주의 · <60% 위험',
    },
    {
        key: 'networkStability',
        label: '네트워크 안정성',
        info: 'SBAS interferogram 그래프의 redundancy·connectivity를 나타냅니다. 낮으면 시계열 inversion 자체가 불안정합니다. DInSAR 단일 페어에는 해당하지 않습니다.',
        fmt: (v) => v.toFixed(2),
        norm: (v) => v,
        grade: (v) => (v >= 0.7 ? 'good' : v >= 0.45 ? 'usable' : 'risk'),
        rule: '≥0.7 양호 · 0.45~0.7 주의 · <0.45 위험',
        skipForDinsar: true,
    },
    {
        key: 'apsContamination',
        label: '대기 영향(APS)',
        info: '대기 수증기·기압에 의한 위상 오염도입니다. 실제 변형처럼 보이는 가짜 신호의 주범입니다. 산악·습윤 지역에서 큽니다. 낮을수록 좋습니다.',
        fmt: (v) => v.toFixed(2),
        norm: (v) => 1 - v, // 낮을수록 좋으므로 막대는 반전
        grade: (v) => (v <= 0.25 ? 'good' : v <= 0.5 ? 'usable' : 'risk'),
        rule: '≤0.25 양호 · 0.25~0.5 주의 · >0.5 위험 (낮을수록 좋음)',
    },
    {
        key: 'residualMm',
        label: '시계열 잔차',
        info: 'SBAS inversion 후 예측 위상과 실측 위상의 RMSE(mm)입니다. 크면 noise·unwrap error·APS가 섞여 있다는 뜻입니다. 낮을수록 좋습니다.',
        fmt: (v) => `${v.toFixed(1)} mm`,
        norm: (v) => clamp01(1 - v / 8),
        grade: (v) => (v <= 2.5 ? 'good' : v <= 5 ? 'usable' : 'risk'),
        rule: '≤2.5mm 양호 · 2.5~5mm 주의 · >5mm 위험 (낮을수록 좋음)',
    },
];

/** 합성 신뢰도 점수 0~1. DInSAR는 네트워크 항을 빼고 나머지를 재정규화한다. */
export function composite(p: QaProduct): number {
    const m = p.metrics;
    const apsScore = 1 - m.apsContamination;
    const resScore = clamp01(1 - m.residualMm / 8);
    const w = { coh: 0.3, unw: 0.25, net: 0.2, aps: 0.15, res: 0.1 };
    if (p.type === 'DInSAR') {
        const tot = w.coh + w.unw + w.aps + w.res; // 0.8
        return (
            (w.coh * m.coherence + w.unw * m.unwrapQuality + w.aps * apsScore + w.res * resScore) / tot
        );
    }
    return (
        w.coh * m.coherence +
        w.unw * m.unwrapQuality +
        w.net * m.networkStability +
        w.aps * apsScore +
        w.res * resScore
    );
}

export type ConfidenceBand = '높음' | '보통' | '낮음';

export interface Confidence {
    band: ConfidenceBand;
    grade: Grade;
}

export function confidenceOf(score: number): Confidence {
    if (score >= 0.8) return { band: '높음', grade: 'good' };
    if (score >= 0.5) return { band: '보통', grade: 'usable' };
    return { band: '낮음', grade: 'risk' };
}

/** 산출물 id로 합성 점수 + 신뢰도 밴드를 한 번에. 매칭 없으면 null. */
export function qaForId(id: string): { product: QaProduct; score: number; conf: Confidence } | null {
    const product = getQaProduct(id);
    if (!product) return null;
    const score = composite(product);
    return { product, score, conf: confidenceOf(score) };
}

/** 변위는 크지만(임계 이상) 신뢰도가 낮은 경우 — 운영에서 가장 위험한 착각. */
export function isMisleading(product: QaProduct, conf: Confidence, velocityThreshold = 25): boolean {
    return Math.abs(product.velocityMmYr) >= velocityThreshold && conf.grade === 'risk';
}

export const QA_GLOSSARY: Array<{ title: string; body: string }> = [
    {
        title: '단일 지표로는 부족하다',
        body: '코히런스가 높아도 언랩이 틀릴 수 있고, 언랩이 좋아도 APS가 심할 수 있다. 그래서 여러 지표를 가중 합성한 신뢰도 점수를 함께 본다.',
    },
    {
        title: '코히런스 / 시계열 코히런스',
        body: '두 시점이 같은 산란체를 보는 정도. 시계열 코히런스는 전체 기간의 안정성으로, PS 후보 판정의 핵심이다. 식생·강우로 급락한다.',
    },
    {
        title: '언랩 품질 / Connected 비율',
        body: 'SNAPHU 결과가 겉보기엔 매끈해도 2π jump·island artifact가 숨어 있을 수 있다. residue density와 connected component로 신뢰 영역을 판정한다.',
    },
    {
        title: '대기 영향(APS)',
        body: '대기 수증기·기압이 실제 변형처럼 보이는 가짜 위상을 만든다. 산악·습윤 지역에서 특히 크며, 지형과 상관된 부드러운 변화면 APS를 의심한다.',
    },
    {
        title: '네트워크 안정성 (SBAS)',
        body: 'SBAS는 interferogram 그래프 기반이라 특정 시기 coherence가 붕괴하면 그래프 연결성이 약해져 시계열 inversion 자체가 불안정해진다.',
    },
    {
        title: '시계열 잔차',
        body: 'inversion 후 예측 위상과 실측 위상의 RMSE. 크면 noise·unwrap error·APS·decorrelation이 섞여 있다는 신호다.',
    },
];
