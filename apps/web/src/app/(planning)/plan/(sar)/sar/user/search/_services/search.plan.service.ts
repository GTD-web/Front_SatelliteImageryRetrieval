/**
 * Scene 검색 Plan 서비스 — Mock 위임
 */
import { mockSearchService } from '../_mocks/search.mock';
import type { ISearchService } from './search.service.interface';

export const searchPlanService: ISearchService = {
    씬을_검색한다: (params) => mockSearchService.씬을_검색한다(params),
};
