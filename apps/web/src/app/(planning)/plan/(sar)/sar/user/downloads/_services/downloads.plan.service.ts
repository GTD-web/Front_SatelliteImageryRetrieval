/**
 * 내 다운로드 Plan 서비스 — Mock 위임
 */
import { mockDownloadsService } from '../_mocks/downloads.mock';
import type { IDownloadsService } from './downloads.service.interface';

export const downloadsPlanService: IDownloadsService = {
    다운로드_잡_목록을_조회한다: () => mockDownloadsService.다운로드_잡_목록을_조회한다(),
    스테이징_진행을_시뮬레이션한다: () => mockDownloadsService.스테이징_진행을_시뮬레이션한다(),
    대기_잡을_시작한다: () => mockDownloadsService.대기_잡을_시작한다(),
    다운로드를_재시도한다: (id) => mockDownloadsService.다운로드를_재시도한다(id),
    NAS에서_다운로드한다: (id) => mockDownloadsService.NAS에서_다운로드한다(id),
};
