import type { ProductType } from '@/_shared/insar-qa';
import type { AnalysisQaUI } from '../_mocks/analysis-qa.ui-interface';

/** 산출물 타입 필터 옵션 (칩 순서) */
export const TYPE_FILTER_OPTIONS: AnalysisQaUI.TypeFilter[] = ['전체', 'DInSAR', 'SBAS', 'PSInSAR'];

/** 산출물 타입별 배지 클래스 */
export const TYPE_BADGE_CLASS: Record<ProductType, string> = {
    DInSAR: 'badge--info',
    SBAS: 'badge--warning',
    PSInSAR: 'badge--brand2',
};

/** 산출물 타입 → 배지 클래스 */
export const typeBadge = (t: ProductType): string => TYPE_BADGE_CLASS[t];
