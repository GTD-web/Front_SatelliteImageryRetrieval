/**
 * 저장된 AOI 라이브러리 Plan 서비스 — Mock 위임
 */
import { mockAoisService } from '../_mocks/aois.mock';
import type { IAoisService } from './aois.service.interface';

export const aoisPlanService: IAoisService = {
    AOI_목록을_조회한다: (params) => mockAoisService.AOI_목록을_조회한다(params),
    AOI를_등록한다: (input) => mockAoisService.AOI를_등록한다(input),
    AOI를_수정한다: (input) => mockAoisService.AOI를_수정한다(input),
    AOI를_삭제한다: (id) => mockAoisService.AOI를_삭제한다(id),
};
