/**
 * 사용자 역할/상태의 단일 출처(single source of truth).
 *
 * 화면에 노출되는 한글 라벨은 모두 이 매핑을 거치게 해서, 표기를 바꿀 때 여기 한 곳만 수정하면
 * 배지·필터·편집 패널 등 모든 사용처에 반영되도록 한다. (TS enum 대신 문자열 유니온 + Record 매핑을
 * 쓴다 — 직렬화/비교가 단순하고 프로젝트의 기존 타입 스타일과 일치한다.)
 */

export type UserRole = 'admin' | 'downloader' | 'viewer' | 'pending';
export type UserStatus = 'active' | 'pending' | 'inactive';

/** 역할 → 한글 라벨. */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
    admin: '관리자',
    downloader: '다운로더',
    viewer: '뷰어',
    pending: '승인 필요',
};

/** 상태 → 한글 라벨. */
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
    active: '활성',
    pending: '대기',
    inactive: '비활성',
};

/** 역할 배지에 적용할 CSS 클래스. 색상도 역할과 함께 한곳에서 관리한다. */
export const USER_ROLE_BADGE_CLASS: Record<UserRole, string> = {
    admin: 'badge badge--brand2',
    downloader: 'badge badge--accent',
    viewer: 'badge badge--neutral',
    pending: 'badge badge--warning',
};

/** 상태 배지에 적용할 CSS 클래스. */
export const USER_STATUS_CLASS: Record<UserStatus, string> = {
    active: 'status status--done',
    pending: 'status status--pending',
    inactive: 'status status--queued',
};

/** 필터/목록 등에서 쓰는 전체 역할 순서. */
export const USER_ROLES: UserRole[] = ['admin', 'downloader', 'viewer', 'pending'];

/** 가입 승인 후 부여 가능한 역할(가입 전 단계인 pending 제외). 편집 패널 역할 선택지로 쓴다. */
export const EDITABLE_USER_ROLES: Exclude<UserRole, 'pending'>[] = ['admin', 'downloader', 'viewer'];
