/**
 * 감사 로그 · UI 타입 (Plan / Current 공용)
 *
 * BE 응답 DTO 가 아니라, 화면이 소비하는 UI 모델만 정의한다.
 * Plan(Mock) 과 Current(실제 API) 가 동일하게 구현하는 계약의 기반 타입.
 */
export namespace AuditLogsUI {
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

    /** 로그 카테고리 */
    export type Category = '로그인' | '다운로드' | '승인' | '시스템';

    /** 감사 로그 1건 */
    export interface Log {
        ts: string;
        actor: string;
        action: string;
        target: string;
        ip: string;
        cat: Category;
    }

    /** 액터 유형 (admin:* → 관리자, system → 시스템, 그 외 → 사용자) */
    export type ActorType = '사용자' | '관리자' | '시스템';

    /** 결과 필터 */
    export type Outcome = 'all' | 'success' | 'fail';

    /** 고급 필터 조건 (기간·액터·액션·결과) */
    export interface AdvFilter {
        /** 'YYYY-MM-DD' (포함). 빈 문자열이면 제한 없음. */
        start: string;
        end: string;
        /** 비어 있으면 전체. */
        actorTypes: ActorType[];
        /** 비어 있으면 전체. */
        actions: string[];
        outcome: Outcome;
    }

    /** 카테고리별 액션 코드 그룹 (고급 필터 액션 선택 UI 용) */
    export interface ActionGroup {
        cat: Category;
        actions: string[];
    }

    /** 감사 로그 목록 조회 파라미터 */
    export interface LogListParams {
        keyword?: string;
    }

    /** 감사 로그 목록 응답 */
    export interface LogListResponse {
        logs: Log[];
        /** 카테고리별 액션 코드 그룹 (고급 필터 액션 선택 UI 용) */
        actionGroups: ActionGroup[];
        /** 데모 데이터의 최신 로그일 — 기간 프리셋 기준점(오늘 대신) */
        latestDate: string;
    }
}
