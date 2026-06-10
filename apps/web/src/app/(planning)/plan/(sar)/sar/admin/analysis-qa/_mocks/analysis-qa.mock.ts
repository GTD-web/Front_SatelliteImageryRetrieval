/**
 * 분석 품질(InSAR QA) Planning Mock (클라이언트 메모리 상태)
 *
 * 원본 page.tsx 가 인라인으로 갖고 있던 scored/KPI/worklist/profile 계산 로직을
 * 그대로 이관한다. 산출물·지표 정의·점수 함수는 `@/_shared/insar-qa` 에서 공유한다.
 * 모듈 스코프에 상태(재처리 큐에 들어간 산출물)를 보관해, mutate 재검증 시 반영되도록 한다.
 */
import {
    composite,
    confidenceOf,
    clamp01,
    METRIC_DEFS,
    QA_GLOSSARY,
    QA_PRODUCTS,
} from '@/_shared/insar-qa';
import type { IAnalysisQaService } from '../_services/analysis-qa.service.interface';
import type { AnalysisQaUI } from './analysis-qa.ui-interface';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 재처리 잡을 큐에 추가한 산출물 이름 — 재처리 요청 누적을 모킹으로 기록만 한다. */
let reprocessedNames: string[] = [];

/** 전체 산출물에 합성 점수/신뢰도를 입힌다. */
function buildScored(): AnalysisQaUI.ScoredProduct[] {
    return QA_PRODUCTS.map((p) => {
        const score = composite(p);
        return { product: p, score, conf: confidenceOf(score) };
    });
}

function buildSummary(): AnalysisQaUI.QaSummary {
    const scored = buildScored();

    // KPI 집계
    const avgScore = scored.reduce((a, s) => a + s.score, 0) / scored.length;
    const trustable = scored.filter((s) => s.score >= 0.5).length;
    const trustPct = Math.round((trustable / scored.length) * 100);
    const lowAlerts = scored.filter((s) => s.score < 0.5).length;
    const avgUnwrap = Math.round(
        (scored.reduce((a, s) => a + s.product.metrics.connectedRatio, 0) / scored.length) * 100,
    );

    const kpis: AnalysisQaUI.KpiCard[] = [
        {
            label: '평균 신뢰도',
            value: avgScore.toFixed(2),
            sub: `${scored.length}개 산출물`,
            tone: confidenceOf(avgScore).grade,
        },
        {
            label: '신뢰 가능 비율',
            value: `${trustPct}%`,
            sub: `${trustable}/${scored.length} (점수 ≥ 0.50)`,
            tone: trustPct >= 80 ? 'good' : trustPct >= 50 ? 'usable' : 'risk',
        },
        {
            label: '평균 언랩 성공',
            value: `${avgUnwrap}%`,
            sub: 'connected component 비율',
            tone: avgUnwrap >= 85 ? 'good' : avgUnwrap >= 60 ? 'usable' : 'risk',
        },
        {
            label: '저신뢰 경보',
            value: String(lowAlerts),
            sub: '점수 < 0.50 — 결과 신뢰 불가',
            tone: lowAlerts === 0 ? 'good' : 'risk',
        },
    ];

    // 재처리 권장 큐 — 신뢰도가 낮거나(점수<0.5) 위험 등급 지표를 가진 산출물만 추려 점수 오름차순.
    const worklist: AnalysisQaUI.WorkItem[] = scored
        .map((s) => ({
            ...s,
            riskMetrics: METRIC_DEFS.filter(
                (d) => !(d.skipForDinsar && s.product.type === 'DInSAR'),
            ).filter((d) => d.grade(s.product.metrics[d.key] as number) === 'risk'),
        }))
        .filter((s) => s.score < 0.5 || s.riskMetrics.length > 0)
        .sort((a, b) => a.score - b.score);

    // 포트폴리오 지표 프로파일 — 전체 산출물 평균(네트워크 안정성은 SBAS/PS 에만 적용).
    const profile: AnalysisQaUI.ProfileRow[] = METRIC_DEFS.map((d) => {
        const applicable = QA_PRODUCTS.filter((p) => !(d.skipForDinsar && p.type === 'DInSAR'));
        const avg = applicable.reduce((a, p) => a + (p.metrics[d.key] as number), 0) / applicable.length;
        return { def: d, avg, grade: d.grade(avg), norm: clamp01(d.norm(avg)) };
    });

    return {
        scored,
        kpis,
        lowAlerts,
        worklist,
        profile,
        glossary: QA_GLOSSARY.map((g) => ({ title: g.title, body: g.body })),
    };
}

export const mockAnalysisQaService: IAnalysisQaService = {
    async 분석품질_요약을_조회한다() {
        await delay(120);
        return { success: true, message: '분석 품질 요약 조회 성공', data: buildSummary() };
    },

    async 산출물_재처리를_요청한다(name) {
        await delay(120);
        reprocessedNames = [...reprocessedNames, name];
        return { success: true, message: `${name} 재처리 잡을 큐에 추가했습니다` };
    },
};
