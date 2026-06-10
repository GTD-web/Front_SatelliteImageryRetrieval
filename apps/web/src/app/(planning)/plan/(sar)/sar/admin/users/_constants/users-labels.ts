/**
 * 사용자 역할/상태 라벨·배지 매핑 재노출.
 *
 * 단일 출처는 `@/_shared/constants/user`. 섹션 UI 는 이 로컬 상수 모듈을 통해 가져와
 * 템플릿(failed-downloads 등)의 `_constants` 사용 규약과 일관성을 맞춘다.
 */
export {
    EDITABLE_USER_ROLES,
    USER_ROLE_BADGE_CLASS,
    USER_ROLE_LABELS,
    USER_ROLES,
    USER_STATUS_CLASS,
    USER_STATUS_LABELS,
} from '@/_shared/constants/user';
