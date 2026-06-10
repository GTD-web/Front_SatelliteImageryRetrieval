/**
 * 내 다운로드 · UI 타입 (Plan / Current 공용)
 *
 * BE 응답 DTO 가 아니라, 화면이 소비하는 UI 모델만 정의한다.
 * Plan(Mock) 과 Current(실제 API) 가 동일하게 구현하는 계약의 기반 타입.
 */
export namespace DownloadsUI {
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

    /** 산출물 종류 */
    export type ProductKind = 'SLC' | 'GRD' | 'RAW';

    /** 다운로드 잡 상태 */
    export type JobStatus = 'running' | 'queued' | 'done' | 'failed';

    /** 다운로드 잡 1건 — 모든 잡은 NAS 스테이징 진행을 표시 (SLC/GRD/RAW 모두 NAS 저장 예정) */
    export interface Job {
        id: string;
        scene: string;
        productKind: ProductKind;
        status: JobStatus;
        progress: number;
        size: string;
        started: string;
        finished: string;
        eta: string;
        user: string;
    }

    export interface JobListResponse {
        jobs: Job[];
    }
}
