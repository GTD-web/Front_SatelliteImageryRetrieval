/**
 * InSAR 결과 뷰어 · UI 타입 (Plan / Current 공용)
 *
 * BE 응답 DTO 가 아니라, 화면이 소비하는 UI 모델만 정의한다.
 * Plan(Mock) 과 Current(실제 API) 가 동일하게 구현하는 계약의 기반 타입.
 *
 * 신뢰도(QA) 점수·등급 로직은 `@/_shared/insar-qa` 에 공유되어 있으므로 여기서는
 * 산출물/레이어/시계열 점 등 결과 뷰어 고유 모델만 정의한다.
 */
export namespace InsarResultsUI {
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

    /** 산출물 타입 */
    export type ProductType = 'DInSAR' | 'SBAS' | 'PSInSAR';

    /** 산출물 타입 필터 ('전체' + 산출물 타입) */
    export type TypeFilter = '전체' | ProductType;

    /** 완료된 InSAR 산출물 1건 */
    export interface InsarProduct {
        id: string;
        name: string;
        type: ProductType;
        range: string;
        mission: string;
        size: string;
        scenes: number;
        owner: string;
    }

    /** 원본 scene 1건 (모달 표시용) */
    export interface SceneItem {
        id: string;
        date: string;
        role: 'master' | 'slave';
        polarization: string;
        size: string;
    }

    /** 핵심 지표(변위 통계) — 산출물별 결정적 mock */
    export interface ProductStats {
        /** 기간 내 LOS 최대 융기 (mm, 양수=융기) */
        maxUpMm: number;
        /** 기간 내 LOS 최대 침하 (mm, 음수) */
        maxDownMm: number;
        /** 평균 변위 속도 (mm/yr) — SBAS/PSInSAR 스택 전용 */
        avgRateMmYr: number;
        /** 평균 coherence — DInSAR 표시용 */
        meanCoherence: number;
        /** 유효 픽셀 비율 (%) — DInSAR 표시용 */
        validPixelPct: number;
        areaKm2: number;
        /** PS/측정점 수 — 스택 전용 */
        points: number;
    }

    /** 지도 오버레이 레이어 종류 */
    export type Layer = 'mean_velocity' | 'coherence' | 'cumulative_disp' | 'wrapped_phase';

    /** 오버레이 컬러맵 */
    export type Colormap = 'RdBu' | 'viridis' | 'magma';

    /** 시계열 점 1건 (지도 클릭으로 추가) */
    export interface Point {
        id: string;
        /** Longitude (EPSG:4326) */
        lon: number;
        /** Latitude (EPSG:4326) */
        lat: number;
        color: string;
        series: number[];
    }

    /** 결과 뷰어 초기 데이터 묶음 (화면이 그리는 모든 서버 데이터) */
    export interface ResultsData {
        /** 완료된 산출물 목록 */
        products: InsarProduct[];
    }
}
