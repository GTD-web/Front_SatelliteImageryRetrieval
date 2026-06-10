/**
 * 분석 기간/가용량 경고 — SBAS(시계열 길이), PSInSAR(PS 통계용 acquisition 장수).
 */
import type { InsarRequestUI } from '../_mocks/insar-request.ui-interface';

type RequestForm = InsarRequestUI.RequestForm;

export interface RangeWarning {
    tone: 'danger' | 'warning';
    text: string;
}

/** 분석 유형별 기간·scene 수 경고를 생성한다. options 탭의 파라미터 섹션에서 표시. */
export function analysisRangeWarnings(form: RequestForm, availableCount: number): RangeWarning[] {
    const day = 24 * 60 * 60 * 1000;
    const spanDays = Math.max(0, (form.endDate.getTime() - form.startDate.getTime()) / day);
    const spanYears = spanDays / 365.25;
    const spanLabel = spanYears >= 1 ? `${spanYears.toFixed(1)}년` : `${Math.round(spanDays / 30)}개월`;
    const out: RangeWarning[] = [];

    if (form.type === 'SBAS') {
        // SBAS velocity 는 시계열 길이에 민감하다. velocity(mm/yr) 숫자 해석은 최소 6개월·권장
        // 1년 이상, 그 이전엔 추세(부호·상대크기) 지표로만.
        if (spanDays < 180) {
            out.push({
                tone: 'danger',
                text: `현재 약 ${spanLabel} — SBAS velocity 산출에는 최소 6개월 이상의 시계열이 필요합니다. 이보다 짧으면 추세 판단도 어렵습니다.`,
            });
        } else if (spanYears < 1) {
            out.push({
                tone: 'warning',
                text: `현재 약 ${spanLabel} — velocity(mm/yr) 숫자 해석은 1년 이상을 권장합니다. 이 구간은 추세(부호·상대 크기) 지표로만 신뢰하세요.`,
            });
        } else if (spanYears < 2) {
            out.push({
                tone: 'warning',
                text: `현재 약 ${spanLabel} — velocity 해석이 가능한 구간입니다. 0~1 mm/yr 미세 변위·계절 평균화에는 2~3년 이상이 더 유리합니다.`,
            });
        }
        if (availableCount > 0 && availableCount < 20) {
            out.push({
                tone: 'warning',
                text: `가용 scene ${availableCount}장 — SBAS 는 15~20장이면 가능하나, 촘촘한 interferogram 망에는 수십 장 이상이 유리합니다.`,
            });
        }
    }

    if (form.type === 'PSInSAR') {
        // PSInSAR 은 점 산란체 통계 — acquisition '장수' 가 핵심. PS 는 장기 베이스라인에 강해
        // 시계열 길이보다 scene 수에 더 민감하다.
        if (availableCount > 0 && availableCount < 20) {
            out.push({
                tone: 'danger',
                text: `가용 scene ${availableCount}장 — PSInSAR 은 PS 후보 식별에 보통 25~30장 이상이 필요합니다. 현재로는 통계가 부족해 신뢰가 낮습니다.`,
            });
        } else if (availableCount > 0 && availableCount < 30) {
            out.push({
                tone: 'warning',
                text: `가용 scene ${availableCount}장 — 동작은 하지만 30장 이상이면 PS 밀도·velocity 정밀도가 좋아집니다.`,
            });
        }
        if (spanYears < 1) {
            out.push({
                tone: 'warning',
                text: `관측 기간 약 ${spanLabel} — PS 는 장기 베이스라인에 강하지만, velocity 정밀도를 위해 최소 1년 이상 시계열을 권장합니다.`,
            });
        }
    }

    return out;
}
