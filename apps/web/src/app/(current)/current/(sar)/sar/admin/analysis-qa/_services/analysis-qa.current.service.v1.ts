/**
 * 분석 품질(InSAR QA) Current 서비스 v1 — 실제 API 연동 자리
 *
 * ⚠️ 백엔드 연결은 프론트 리팩토링 마무리 후 진행 예정.
 * 지금은 Plan 의 Context/UI 를 그대로 재사용할 수 있도록 계약(IAnalysisQaService)만
 * 충족하는 스텁이다. 각 메서드는 추후 `/api/sar/admin/analysis-qa` BFF 라우트로 교체한다.
 *
 * BFF 연동 시 교체 지점:
 *   - 분석품질_요약을_조회한다 → GET  /api/sar/admin/analysis-qa/summary
 *   - 산출물_재처리를_요청한다 → POST /api/sar/admin/analysis-qa/{name}/reprocess
 */
import type { IAnalysisQaService } from '@/app/(planning)/plan/(sar)/sar/admin/analysis-qa/_services/analysis-qa.service.interface';

const NOT_CONNECTED = '백엔드 미연결: 분석 QA API 는 리팩토링 완료 후 연결됩니다.';

export const analysisQaCurrentServiceV1: IAnalysisQaService = {
    async 분석품질_요약을_조회한다() {
        return {
            success: false,
            message: NOT_CONNECTED,
            data: { scored: [], kpis: [], lowAlerts: 0, worklist: [], profile: [], glossary: [] },
        };
    },

    async 산출물_재처리를_요청한다(name) {
        return { success: false, message: `${NOT_CONNECTED} (${name})` };
    },
};
