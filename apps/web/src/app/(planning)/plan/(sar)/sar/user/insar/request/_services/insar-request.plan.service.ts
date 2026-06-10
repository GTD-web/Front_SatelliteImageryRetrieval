/**
 * InSAR 분석 요청 Plan 서비스 — Mock 위임
 */
import { mockInsarRequestService } from '../_mocks/insar-request.mock';
import type { IInsarRequestService } from './insar-request.service.interface';

export const insarRequestPlanService: IInsarRequestService = {
    가용_씬을_조회한다: (params) => mockInsarRequestService.가용_씬을_조회한다(params),
    기법_적합도를_평가한다: (params) => mockInsarRequestService.기법_적합도를_평가한다(params),
    InSAR_요청을_제출한다: (params) => mockInsarRequestService.InSAR_요청을_제출한다(params),
};
