/**
 * 동기화 모니터 · UI 타입 (Plan / Current 공용)
 */
export namespace SyncMonitorUI {
    export interface ServiceResponse {
        success: boolean;
        message: string;
    }

    export interface ServiceResponseWithData<T = unknown> {
        success: boolean;
        data?: T;
        message: string;
    }

    /** 동기화 실행 결과 상태 (티커 tone 과 동일 분류) */
    export type RunStatus = 'success' | 'warning' | 'failed';

    /** 동기화 실행 결과 1건 */
    export interface Run {
        aoi: string;
        started: string;
        duration: string;
        fetched: number;
        status: RunStatus;
        err?: string;
    }

    export interface SyncHistoryResponse {
        runs: Run[];
    }
}
