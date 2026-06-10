import type { DashboardUI } from '../_mocks/dashboard.ui-interface';

/** 시간 범위 한글 라벨 */
export const RANGE_LABEL: Record<DashboardUI.Range, string> = {
    '1h': '지난 1시간',
    '24h': '지난 24시간',
    '7d': '지난 7일',
    '30d': '지난 30일',
};

/** 처리량 차트 부제목에 쓰는 범위별 버킷 단위 */
export const RANGE_BUCKET_LABEL: Record<DashboardUI.Range, string> = {
    '1h': '5분',
    '24h': '15분',
    '7d': '6시간',
    '30d': '1일',
};

/** 선택 가능한 시간 범위 목록 (세그먼트 버튼 순서) */
export const RANGE_OPTIONS: DashboardUI.Range[] = ['1h', '24h', '7d', '30d'];

/** 실시간 이벤트 상태별 색상 */
export const STATUS_COLOR: Record<string, string> = {
    completed: 'var(--success)',
    success: 'var(--success)',
    pending: 'var(--warning)',
    running: 'var(--info)',
    failed: 'var(--danger)',
    submit: 'var(--accent)',
    created: 'var(--accent)',
    change: 'var(--info)',
    maintenance: 'var(--text-tertiary)',
};
