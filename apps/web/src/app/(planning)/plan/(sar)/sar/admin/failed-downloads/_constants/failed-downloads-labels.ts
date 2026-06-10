import type { FailedDownloadsUI } from '../_mocks/failed-downloads.ui-interface';

/** 실패 사유 한글 라벨 */
export const KIND_LABEL: Record<FailedDownloadsUI.FailureKind, string> = {
    CDSE_5XX: 'CDSE 5XX',
    NAS_FULL: 'NAS 용량 부족',
    AUTH: '인증',
    CHECKSUM: '체크섬',
    NETWORK: '네트워크',
    TIMEOUT: '타임아웃',
};

/** 실패 사유 배지 톤 */
export const KIND_TONE: Record<FailedDownloadsUI.FailureKind, string> = {
    CDSE_5XX: 'badge--warning',
    NAS_FULL: 'badge--danger',
    AUTH: 'badge--warning',
    CHECKSUM: 'badge--warning',
    NETWORK: 'badge--neutral',
    TIMEOUT: 'badge--neutral',
};

/** 산출물 종류 배지 톤 */
export const PRODUCT_TONE: Record<FailedDownloadsUI.ProductKind, string> = {
    SLC: 'badge--solid',
    GRD: 'badge--accent',
    OCN: 'badge--neutral',
    RAW: 'badge--neutral',
};
