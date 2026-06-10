import type { DownloadsUI } from '../_mocks/downloads.ui-interface';

/** 잡 상태 한글 라벨 */
export const STATUS_LABEL: Record<DownloadsUI.JobStatus, string> = {
    running: '진행중',
    queued: '대기',
    done: '완료',
    failed: '실패',
};

/** 산출물 종류 배지 톤 */
export const PRODUCT_TONE: Record<DownloadsUI.ProductKind, string> = {
    SLC: 'badge--solid',
    GRD: 'badge--accent',
    RAW: 'badge--neutral',
};

/** 동시 NAS 스테이징 슬롯 수 — 잡 종류 무관 공용 큐 (푸터 표시용) */
export const MAX_PARALLEL_STAGING = 3;
