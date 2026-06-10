/**
 * InSAR 결과 뷰어 Plan 서비스 — Mock 위임
 */
import { mockInsarResultsService } from '../_mocks/insar-results.mock';
import type { IInsarResultsService } from './insar-results.service.interface';

export const insarResultsPlanService: IInsarResultsService = {
    결과_데이터를_조회한다: () => mockInsarResultsService.결과_데이터를_조회한다(),
    산출물_다운로드를_요청한다: (productId) =>
        mockInsarResultsService.산출물_다운로드를_요청한다(productId),
};
