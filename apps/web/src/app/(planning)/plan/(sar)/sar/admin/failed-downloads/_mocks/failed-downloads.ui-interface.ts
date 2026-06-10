/**
 * 실패한 다운로드 관리 · UI 타입 (Plan / Current 공용)
 *
 * BE 응답 DTO 가 아니라, 화면이 소비하는 UI 모델만 정의한다.
 * Plan(Mock) 과 Current(실제 API) 가 동일하게 구현하는 계약의 기반 타입.
 */
export namespace FailedDownloadsUI {
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

    /** 다운로드 실패 사유 분류 */
    export type FailureKind = 'CDSE_5XX' | 'NAS_FULL' | 'AUTH' | 'CHECKSUM' | 'NETWORK' | 'TIMEOUT';

    /** 산출물 종류 */
    export type ProductKind = 'SLC' | 'GRD' | 'OCN' | 'RAW';

    /** 실패한 다운로드 잡 1건 */
    export interface FailedJob {
        id: string;
        scene: string;
        productKind: ProductKind;
        size: string;
        user: string;
        email: string;
        failedAt: string;
        attempts: number;
        kind: FailureKind;
        detail: string;
    }

    export interface FailedJobListParams {
        keyword?: string;
    }

    export interface FailedJobListResponse {
        jobs: FailedJob[];
    }
}
