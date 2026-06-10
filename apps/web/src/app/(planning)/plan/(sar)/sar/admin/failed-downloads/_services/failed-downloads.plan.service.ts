/**
 * 실패한 다운로드 Plan 서비스 — Mock 위임
 */
import { mockFailedDownloadsService } from '../_mocks/failed-downloads.mock';
import type { IFailedDownloadsService } from './failed-downloads.service.interface';

export const failedDownloadsPlanService: IFailedDownloadsService = {
    실패_다운로드_목록을_조회한다: (params) =>
        mockFailedDownloadsService.실패_다운로드_목록을_조회한다(params),
    다운로드를_재시도한다: (id) => mockFailedDownloadsService.다운로드를_재시도한다(id),
    다운로드를_무시한다: (id) => mockFailedDownloadsService.다운로드를_무시한다(id),
};
