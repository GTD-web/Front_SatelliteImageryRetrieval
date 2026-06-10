/**
 * 사용자 관리 · UI 타입 (Plan / Current 공용)
 *
 * BE 응답 DTO 가 아니라, 화면이 소비하는 UI 모델만 정의한다.
 * Plan(Mock) 과 Current(실제 API) 가 동일하게 구현하는 계약의 기반 타입.
 */
import type { UserRole, UserStatus } from '@/_shared/constants/user';

export namespace UsersUI {
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

    /** 역할 / 상태 — 단일 출처(`@/_shared/constants/user`)를 재노출 */
    export type Role = UserRole;
    export type Status = UserStatus;

    /** 사용자 1건 */
    export interface User {
        email: string;
        name: string;
        role: Role;
        status: Status;
        joined: string;
        last: string;
        /** 회원가입 시 제출한 소속 기관. 초대로 생성된 계정은 비어 있을 수 있다. */
        organization: string;
        /** 회원가입 시 제출한 연락처(선택). */
        phone?: string;
        /** 회원가입 시 제출한 이용 목적. */
        purpose: string;
    }

    export interface UserListParams {
        keyword?: string;
    }

    export interface UserListResponse {
        users: User[];
    }

    /** 초대 입력 — 이메일 + 부여할 역할 + 안내 메시지(선택). */
    export interface InviteUserInput {
        email: string;
        role: Role;
        message?: string;
    }

    /** 편집 저장 patch — 이름/역할/상태만 변경 가능. */
    export interface UpdateUserInput {
        name: string;
        role: Role;
        status: Status;
    }
}
