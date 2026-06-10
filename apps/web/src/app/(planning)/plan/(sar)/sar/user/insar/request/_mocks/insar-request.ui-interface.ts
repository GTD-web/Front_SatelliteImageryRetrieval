/**
 * InSAR 분석 요청 · UI 타입 (Plan / Current 공용)
 *
 * BE 응답 DTO 가 아니라, 화면(요청 위저드)이 소비하는 UI 모델만 정의한다.
 * Plan(Mock) 과 Current(실제 API) 가 동일하게 구현하는 계약의 기반 타입.
 *
 * ⚠️ 저장된 AOI(라이브러리) 는 이 요청 도메인에 들어오지 않는다.
 * AOI 저장/불러오기는 페이지 간 공유 상태(SavedAoisContext) 가 담당한다.
 */
export namespace InsarRequestUI {
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

    /** InSAR 분석 기법 — 두 시점 차분(DInSAR) · 시계열(SBAS) · 영구산란체(PSInSAR). */
    export type AnalysisType = 'DInSAR' | 'PSInSAR' | 'SBAS';

    /** 위성 플랫폼 — Sentinel-1(C-band) vs NISAR(L-band). */
    export type Platform = 'S1' | 'NISAR';

    /** 기간 프리셋 칩. */
    export type DatePreset = '1주' | '1개월' | '3개월' | '1년';

    /** 폼 검증 실패 필드 키 — 토스트·인라인 표시 공용. */
    export type FieldErrorKey = 'name' | 'aoi' | 'mission' | 'reference' | 'scenes';

    /** 검증 실패 시 어느 입력이 문제인지 + 메시지. */
    export interface FieldError {
        field: FieldErrorKey;
        message: string;
    }

    /** 요청 폼(draft) 전체 상태 — 위저드의 모든 입력값. */
    export interface RequestForm {
        name: string;
        type: AnalysisType;
        nwLat: string;
        nwLon: string;
        seLat: string;
        seLon: string;
        startDate: Date;
        endDate: Date;
        platform: Platform;
        s1a: boolean;
        s1c: boolean;
        polarization: string;
        coherenceMin: number;
        temporalBaselineMaxDays: number;
        spatialBaselineMaxM: number;
        minScenes: number;
        /** PSInSAR reference point 선택 방식 — 자동(가장 안정한 PS) vs 직접 좌표. */
        referenceMode: 'auto' | 'manual';
        referenceLon: string;
        referenceLat: string;
        /** 기간 프리셋 칩 활성 표시용 — 날짜를 직접 바꾸면 '' 로 해제. */
        datePreset: DatePreset | '';
    }

    /** AOI + 기간 + 미션을 기반으로 조회되는 가용 scene 한 건. */
    export interface AvailableScene {
        id: string;
        date: string;
        isoDate: string;
        mission: 'S1A' | 'S1C' | 'NISAR';
        pass: 'ASC' | 'DESC';
        /** 가상 perpendicular baseline (m), -200~+200 범위. */
        perpBaseline: number;
        footprint: Array<[number, number]>;
    }

    /** 가용 scene 조회 파라미터 — 폼 중 카탈로그에 영향을 주는 부분만. */
    export interface AvailableScenesParams {
        nwLat: string;
        nwLon: string;
        seLat: string;
        seLon: string;
        startDate: Date;
        endDate: Date;
        platform: Platform;
        s1a: boolean;
        s1c: boolean;
    }

    /** 기법별 예상 적합도. */
    export type Suitability = 'good' | 'fair' | 'poor';

    /** 자동 추천 — 한 기법에 대한 적합도 평가 결과. */
    export interface Recommendation {
        type: AnalysisType;
        suitability: Suitability;
        sceneIds: string[];
        sceneCount: number;
        spanLabel: string;
        reason: string;
        /** 스택(SBAS/PSInSAR) 기준 대비 |B⊥| 범위(m). DInSAR 은 null. */
        perpRange: { min: number; max: number } | null;
    }

    /** 자동 추천 조회 파라미터 — 위치(AOI)+기간만으로 평가. */
    export interface AssessParams {
        nwLat: string;
        nwLon: string;
        seLat: string;
        seLon: string;
        startDate: Date;
        endDate: Date;
    }

    /** InSAR 요청 제출 파라미터 — 폼 + 선택된 scene id. */
    export interface SubmitParams {
        form: RequestForm;
        sceneIds: string[];
    }

    /** 제출 결과 — 접수 요청 id 와 안내 메시지. */
    export interface SubmitResult {
        requestId: string;
        type: AnalysisType;
        sceneCount: number;
    }
}
