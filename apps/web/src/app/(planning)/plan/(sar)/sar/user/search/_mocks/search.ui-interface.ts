import type { HifiScene } from '@/_shared/contexts/HifiCartContext';

/**
 * Scene 검색 · UI 타입 (Plan / Current 공용)
 *
 * BE 응답 DTO 가 아니라, 화면이 소비하는 UI 모델만 정의한다.
 * Plan(Mock) 과 Current(실제 API) 가 동일하게 구현하는 계약의 기반 타입.
 *
 * ⚠️ 저장된 AOI(라이브러리) 는 이 검색 도메인에 들어오지 않는다.
 * AOI 저장/불러오기는 페이지 간 공유 상태(SavedAoisContext) 가 담당한다.
 */
export namespace SearchUI {
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

    /** 검색 결과 scene 한 건 — 카트(HifiScene) 와 동일 모델 재사용. */
    export type Scene = HifiScene;

    /** 검색 가능한 위성 플랫폼. 'S1' 은 정식 지원, 'S2' 는 광학 필터 UI 만 목업, 나머지는 준비 중. */
    export type Platform = 'S1' | 'S2' | 'nisar' | 'umbra' | 'capella' | 'kompsat';

    export interface PlatformDef {
        value: Platform;
        label: string;
        kind: 'SAR' | 'EO';
        ready: boolean;
        note?: string;
    }

    export type ProductMode = 'slc' | 'others';
    export type DatePreset = '1주' | '1개월' | '3개월' | '1년' | '';

    /** Sentinel-1 / NISAR 공용 필터 상태(사이드바 입력). */
    export interface Filters {
        s1a: boolean;
        s1c: boolean;
        productMode: ProductMode;
        grd: boolean;
        raw: boolean;
        pol: string[];
        passA: boolean;
        passD: boolean;
        // NISAR (L/S-band SAR) — 밴드/제품/편광. S1 의 s1a·s1c·productMode 와 독립.
        nisarBands: string[];
        nisarProduct: 'RSLC' | 'GSLC' | 'GCOV';
        nisarPol: string[];
        haveOnly: boolean;
        esaRefresh: boolean;
        startDate: Date;
        endDate: Date;
        datePreset: DatePreset;
    }

    /** Sentinel-2(광학) 전용 필터 상태. */
    export interface S2Filters {
        level: 'L1C' | 'L2A';
        cloudMax: number;
        bands: string[];
    }

    /** SWR 로 전달하는 검색 파라미터 — 플랫폼/필터/검색어 조합. */
    export interface SearchParams {
        platform: Platform;
        filters: Filters;
        s2Filters: S2Filters;
        query: string;
    }

    /** 검색 응답 — 일치하는 scene 목록과 facet 카운트. */
    export interface SearchResult {
        scenes: Scene[];
        facetCounts: Record<string, number>;
    }

    /** 좌상단(북서)·우하단(남동) 직사각형 bbox. */
    export interface AoiBounds {
        nwLat: number;
        nwLon: number;
        seLat: number;
        seLon: number;
    }
}
