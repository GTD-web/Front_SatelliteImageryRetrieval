import type { AuditLogsUI } from '../_mocks/audit-logs.ui-interface';

/** 카테고리 탭 목록 ('전체' + 카테고리) */
export const CATEGORY_TABS: Array<'전체' | AuditLogsUI.Category> = ['전체', '로그인', '다운로드', '승인', '시스템'];

/** 카테고리 정렬 순서 (고급 필터 액션 그룹핑 기준) */
export const CATEGORY_ORDER: AuditLogsUI.Category[] = ['로그인', '다운로드', '승인', '시스템'];

/** 선택 가능한 액터 유형 목록 */
export const ACTOR_TYPES: AuditLogsUI.ActorType[] = ['사용자', '관리자', '시스템'];

/** 결과 세그먼트 옵션 (키, 라벨) */
export const OUTCOME_OPTIONS: Array<[AuditLogsUI.Outcome, string]> = [
    ['all', '전체'],
    ['success', '성공만'],
    ['fail', '실패만'],
];

/** 액션 코드 → 표시 색상 (실패/성공/로그인/기타) */
export const actionColor = (a: string): string =>
    a.includes('FAIL')
        ? 'var(--danger)'
        : a.includes('APPROVE') || a.includes('COMPLETE')
          ? 'var(--success)'
          : a.includes('LOGIN')
            ? 'var(--info)'
            : 'var(--text-secondary)';

/** 액터 문자열 → 유형. admin:* 은 관리자, system 은 시스템, 그 외는 사용자. */
export const actorTypeOf = (actor: string): AuditLogsUI.ActorType =>
    actor.startsWith('admin') ? '관리자' : actor === 'system' ? '시스템' : '사용자';

/** 액션 코드가 실패를 의미하는가 */
export const isFail = (action: string): boolean => action.includes('FAIL');
