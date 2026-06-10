import type { CrawlTargetsUI } from '../_mocks/crawl-targets.ui-interface';

/**
 * 크롤 대상(AOI) UI 서비스 (Plan / Current 동일 인터페이스)
 *
 * Context 의 queries/commands 는 이 계약에만 의존하며,
 * Plan(Mock) / Current(실제 API) 구현을 주입받아 환경을 분기한다.
 */
export interface ICrawlTargetsService {
    AOI_목록을_조회한다(
        params?: CrawlTargetsUI.AoiListParams,
    ): Promise<CrawlTargetsUI.ServiceResponseWithData<CrawlTargetsUI.AoiListResponse>>;

    AOI를_크롤한다(
        name: string,
    ): Promise<CrawlTargetsUI.ServiceResponseWithData<CrawlTargetsUI.Aoi>>;

    AOI를_생성한다(
        input: CrawlTargetsUI.CreateAoiInput,
    ): Promise<CrawlTargetsUI.ServiceResponseWithData<CrawlTargetsUI.Aoi>>;
}
