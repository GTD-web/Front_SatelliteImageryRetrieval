/**
 * 크롤 대상(AOI) Plan 서비스 — Mock 위임
 */
import { mockCrawlTargetsService } from '../_mocks/crawl-targets.mock';
import type { ICrawlTargetsService } from './crawl-targets.service.interface';

export const crawlTargetsPlanService: ICrawlTargetsService = {
    AOI_목록을_조회한다: (params) => mockCrawlTargetsService.AOI_목록을_조회한다(params),
    AOI를_크롤한다: (name) => mockCrawlTargetsService.AOI를_크롤한다(name),
    AOI를_생성한다: (input) => mockCrawlTargetsService.AOI를_생성한다(input),
};
