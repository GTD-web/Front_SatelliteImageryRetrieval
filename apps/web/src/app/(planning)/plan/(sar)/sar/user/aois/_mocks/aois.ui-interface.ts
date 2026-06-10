/**
 * 저장된 AOI 라이브러리 · UI 타입
 *
 * AOI 라이브러리는 백엔드 리소스가 아니라 앱 전역 공유 클라이언트 상태(`SavedAoisContext`)이다.
 * `Aoi` 는 `SavedAoi` 와 동일 구조이며, 화면이 소비하는 UI 모델만 정의한다.
 */
export namespace AoisUI {
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
