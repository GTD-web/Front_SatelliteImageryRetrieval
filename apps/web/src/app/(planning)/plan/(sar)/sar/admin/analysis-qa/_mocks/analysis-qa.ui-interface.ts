/**
 * 분석 품질(InSAR QA) · UI 타입 (Plan / Current 공용)
 *
 * BE 응답 DTO 가 아니라, 화면이 소비하는 UI 모델만 정의한다.
 * Plan(Mock) 과 Current(실제 API) 가 동일하게 구현하는 계약의 기반 타입.
 *
 * 산출물·지표 정의·점수 로직은 `@/_shared/insar-qa` 에 공유되어 있고, 이 화면은
 * 그로부터 이미 해석된(점수/등급/경보가 포함된) 요약 모델만 소비한다.
 */
import type {
    Confidence,
    Grade,
    MetricDef,
    ProductType,
    QaProduct,
} from '@/_shared/insar-qa';

export namespace AnalysisQaUI {
    /** 공통 서비스 응답 (데이터 없음) */
    export interface ServiceResponse {
        success: boolean;
        message: string;
    }

    /** 공통 서비스 응답 (데이터 포함) */
    export interface ServiceResponseWithData<T = unknown> {
        success: boolean;
        data?: T;
        message: string;
    }

    /** 산출물 타입 필터 ('전체' + 산출물 타입) */
    export type TypeFilter = '전체' | ProductType;

    /** 합성 점수/신뢰도가 해석된 산출물 1건 */
    export interface ScoredProduct {
        product: QaProduct;
        score: number;
        conf: Confidence;
    }

    /** 선택 산출물 상세 (변위 vs 신뢰도) */
    export type Detail = ScoredProduct;

    /** 재처리 권장 큐 항목 — 저신뢰/위험 산출물 + 위험 지표 목록 */
    export interface WorkItem extends ScoredProduct {
        riskMetrics: MetricDef[];
    }

    /** 포트폴리오 지표 프로파일 1행 — 전체 산출물 평균 */
    export interface ProfileRow {
        def: MetricDef;
        avg: number;
        grade: Grade;
        norm: number;
    }

    /** KPI 카드 1건 (이미 해석된 값/톤) */
    export interface KpiCard {
        label: string;
        value: string;
        sub: string;
        tone: Grade;
    }

    /** QA 지표 설명(배경 지식) 1건 */
    export interface GlossaryEntry {
        title: string;
        body: string;
    }

    /** 분석 품질 요약 (화면이 그리는 모든 데이터 묶음) */
    export interface QaSummary {
        /** 점수/신뢰도가 해석된 전체 산출물 (테이블/상세 소스) */
        scored: ScoredProduct[];
        /** KPI 카드 4종 */
        kpis: KpiCard[];
        /** 저신뢰 경보 건수 (툴바 배지) */
        lowAlerts: number;
        /** 재처리 권장 큐 (점수 오름차순) */
        worklist: WorkItem[];
        /** 포트폴리오 지표 프로파일 */
        profile: ProfileRow[];
        /** QA 지표 설명 */
        glossary: GlossaryEntry[];
    }
}
