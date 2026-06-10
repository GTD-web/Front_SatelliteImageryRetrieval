/**
 * 저장된 AOI 라이브러리 · UI 타입 (Plan / Current 공용)
 *
 * BE 응답 DTO 가 아니라, 화면이 소비하는 UI 모델만 정의한다.
 * Plan(Mock) 과 Current(실제 API) 가 동일하게 구현하는 계약의 기반 타입.
 */
export namespace AoisUI {
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

    /** 저장된 AOI(직사각형 bbox) 한 건 */
    export interface Aoi {
        id: string;
        name: string;
        description?: string;
        nwLat: number;
        nwLon: number;
        seLat: number;
        seLon: number;
        /** ISO 8601 string */
        createdAt: string;
    }

    /** 지도에서 그려 캡처한 직사각형 좌표 */
    export interface AoiBounds {
        nwLat: number;
        nwLon: number;
        seLat: number;
        seLon: number;
    }

    export interface AoiListParams {
        keyword?: string;
    }

    export interface AoiListResponse {
        aois: Aoi[];
    }

    /** 새 AOI 등록 입력 */
    export interface CreateAoiInput {
        name: string;
        description?: string;
        nwLat: number;
        nwLon: number;
        seLat: number;
        seLon: number;
    }

    /** AOI 이름·설명 수정 입력 */
    export interface RenameAoiInput {
        id: string;
        name: string;
        description?: string;
    }
}
