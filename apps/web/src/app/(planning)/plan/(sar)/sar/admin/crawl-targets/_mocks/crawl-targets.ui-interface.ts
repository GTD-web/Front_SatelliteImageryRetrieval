/**
 * 크롤 대상(AOI) 관리 · UI 타입 (Plan / Current 공용)
 *
 * BE 응답 DTO 가 아니라, 화면이 소비하는 UI 모델만 정의한다.
 * Plan(Mock) 과 Current(실제 API) 가 동일하게 구현하는 계약의 기반 타입.
 */
export namespace CrawlTargetsUI {
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

    /** AOI 동기화 상태 */
    export type AoiStatus = 'healthy' | 'warning' | 'stale' | 'failed';

    /** 크롤 대상 AOI */
    export interface Aoi {
        name: string;
        owner: string;
        scenes: number;
        /** 마지막 크롤 시각(표시용 상대 문자열) */
        last: string;
        status: AoiStatus;
        /** Footprint ring [lon, lat][] (EPSG:4326), 단일 ring */
        coords: Array<[number, number]>;
    }

    export interface AoiListParams {
        keyword?: string;
    }

    export interface AoiListResponse {
        aois: Aoi[];
    }

    /** 지도에서 폴리곤/사각형으로 그려 새 AOI 를 만들 때의 입력 */
    export interface CreateAoiInput {
        coords: Array<[number, number]>;
        owner?: string;
    }
}
