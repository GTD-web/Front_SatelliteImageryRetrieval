/**
 * InSAR 분석 요청 Planning Mock (클라이언트 메모리)
 *
 * 가용 scene 카탈로그·기법 적합도·요청 제출을 모킹한다. 실제로는 백엔드
 * 추천 엔드포인트(가칭 POST /api/v1/analysis/recommend)가 정밀궤도·baseline·
 * coherence proxy·토지피복으로 가장 좋은 스택을 골라 내려준다. 진행(승인) 시에는
 * POST /api/v1/jobs/{dinsar|sbas|psi}(auto_ingest:true)로 job 을 생성한다.
 *
 * ⚠️ 저장된 AOI 는 이 도메인에 들어오지 않는다(공유 SavedAoisContext 담당).
 */
import { PERP_WARN_M } from '../_constants/insar-analysis';
import { parseAoiFromForm, vegState } from '../_constants/insar-form';
import type { IInsarRequestService } from '../_services/insar-request.service.interface';
import type { InsarRequestUI } from './insar-request.ui-interface';

type AvailableScene = InsarRequestUI.AvailableScene;
type AvailableScenesParams = InsarRequestUI.AvailableScenesParams;
type Recommendation = InsarRequestUI.Recommendation;
type Suitability = InsarRequestUI.Suitability;
type AnalysisType = InsarRequestUI.AnalysisType;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * AOI + 기간 + 미션 선택을 기반으로 모킹된 사용 가능한 scene 리스트를 생성한다.
 */
function generateAvailableScenes(params: AvailableScenesParams): AvailableScene[] {
    const aoi = parseAoiFromForm(params);
    if (!aoi) return [];
    const missions: ('S1A' | 'S1C' | 'NISAR')[] = [];
    if (params.platform === 'NISAR') {
        // NISAR — 단일 위성. L-band RSLC 로 repeat-pass InSAR 스택을 구성한다.
        missions.push('NISAR');
    } else {
        if (params.s1a) missions.push('S1A');
        if (params.s1c) missions.push('S1C');
    }
    if (missions.length === 0) return [];
    const day = 24 * 60 * 60 * 1000;
    // 고정 anchor 기준 cadence — startDate 가 바뀌어도 각 scene 의 절대 위치는 불변.
    const ANCHOR = new Date(2024, 0, 1).getTime();
    const stepMs = (12 / missions.length) * day;
    const startT = params.startDate.getTime();
    const endT = params.endDate.getTime();
    const firstIdx = Math.max(0, Math.ceil((startT - ANCHOR) / stepMs));
    const lastIdx = Math.floor((endT - ANCHOR) / stepMs);
    const out: AvailableScene[] = [];
    for (let i = firstIdx; i <= lastIdx && out.length < 400; i++) {
        const t = ANCHOR + i * stepMs;
        const m = missions[i % missions.length]!;
        const d = new Date(t);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const perp = Math.round(Math.sin(i * 1.7) * 180);
        const offsetLon = ((i % 7) - 3) * 0.006;
        const offsetLat = ((i % 5) - 2) * 0.004;
        const fp: Array<[number, number]> = aoi.map(
            ([lon, lat]) => [lon + offsetLon, lat + offsetLat] as [number, number],
        );
        const id =
            m === 'NISAR'
                ? `NISAR_L_RSLC_${yyyy}${mm}${dd}T0930_${i}`
                : `${m}_IW_SLC__1SDV_${yyyy}${mm}${dd}T211515_${i}`;
        out.push({
            id,
            date: `${yyyy}-${mm}-${dd}`,
            isoDate: `${yyyy}-${mm}-${dd}`,
            mission: m,
            pass: i % 2 === 0 ? 'ASC' : 'DESC',
            perpBaseline: perp,
            footprint: fp,
        });
    }
    return out;
}

/** DInSAR 최적 페어 — ΔT≤24일·식생 상태 일치·작은 |B⊥| 우선. 없으면 비용 최소 페어. */
function bestDinsarPair(scenes: AvailableScene[]): string[] {
    if (scenes.length < 2) return scenes.map((s) => s.id);
    const day = 24 * 60 * 60 * 1000;
    let best: { ids: [string, string]; cost: number } | null = null;
    for (let i = 0; i < scenes.length; i++) {
        for (let j = i + 1; j < scenes.length; j++) {
            const a = scenes[i]!;
            const b = scenes[j]!;
            const days = Math.abs((new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime()) / day);
            const perp = Math.abs(a.perpBaseline - b.perpBaseline);
            const phenologyMismatch =
                vegState(a.isoDate) === 'transition' ||
                vegState(b.isoDate) === 'transition' ||
                vegState(a.isoDate) !== vegState(b.isoDate);
            // 낮을수록 좋은 비용: ΔT + B⊥ 가중 + (24일 초과·식생 불일치) 페널티
            const cost = days + perp * 0.5 + (days > 24 ? 500 : 0) + (phenologyMismatch ? 1000 : 0);
            if (!best || cost < best.cost) best = { ids: [a.id, b.id], cost };
        }
    }
    return best ? [...best.ids] : scenes.slice(0, 2).map((s) => s.id);
}

/**
 * 가용 데이터로 세 분석 기법의 예상 적합도를 각각 평가한다(mock).
 * 도심=PSI / 광역=SBAS / 단기·소수=DInSAR 를 scene 수·기간으로 근사한다.
 * 자동 모드는 위성도 자동 선택하므로 S1A+S1C 컨스텔레이션 전부를 후보로 둔다.
 * 반환은 적합도 높은 순 정렬 — 첫 번째가 추천 기법이다.
 */
function assessMethods(params: InsarRequestUI.AssessParams): Recommendation[] {
    const aoi = parseAoiFromForm(params);
    if (!aoi) return [];
    const scenes = generateAvailableScenes({
        ...params,
        platform: 'S1',
        s1a: true,
        s1c: true,
    });
    if (scenes.length === 0) return [];
    const day = 24 * 60 * 60 * 1000;
    const spanDays = Math.max(0, (params.endDate.getTime() - params.startDate.getTime()) / day);
    const spanYears = spanDays / 365.25;
    const spanLabel = spanYears >= 1 ? `${spanYears.toFixed(1)}년` : `${Math.round(spanDays / 30)}개월`;
    const n = scenes.length;

    // 스택(SBAS/PSI) 공용 — 기준 B⊥ 중앙값 대비 임계 이내 scene.
    const sorted = [...scenes].sort((a, b) => a.perpBaseline - b.perpBaseline);
    const refPerp = sorted[Math.floor(sorted.length / 2)]!.perpBaseline;
    const stackPick = scenes.filter((s) => Math.abs(s.perpBaseline - refPerp) <= PERP_WARN_M);
    const stack = stackPick.length >= 2 ? stackPick : scenes;
    const stackIds = stack.map((s) => s.id);
    const stackRel = stack.map((s) => Math.abs(s.perpBaseline - refPerp));
    const stackPerp = { min: Math.round(Math.min(...stackRel)), max: Math.round(Math.max(...stackRel)) };

    // DInSAR — 최적 페어 1쌍 + 그 페어의 품질(ΔT·식생 일치) 평가.
    const pairIds = bestDinsarPair(scenes);
    const pair = pairIds.map((id) => scenes.find((s) => s.id === id)).filter(Boolean) as AvailableScene[];
    const pairGood =
        pair.length === 2 &&
        Math.abs((new Date(pair[0]!.isoDate).getTime() - new Date(pair[1]!.isoDate).getTime()) / day) <= 24 &&
        vegState(pair[0]!.isoDate) !== 'transition' &&
        vegState(pair[1]!.isoDate) !== 'transition' &&
        vegState(pair[0]!.isoDate) === vegState(pair[1]!.isoDate);

    const dinsar: Recommendation = {
        type: 'DInSAR',
        suitability: n < 2 ? 'poor' : pairGood ? 'good' : 'fair',
        sceneIds: pairIds,
        sceneCount: pairIds.length,
        spanLabel,
        reason:
            n < 2
                ? '페어를 만들 scene 이 부족합니다.'
                : pairGood
                  ? '시간 간격·식생 상태가 잘 맞는 페어가 있어 두 시점 변화 탐지에 적합합니다.'
                  : '페어는 가능하나 시간 간격·계절이 어긋나 coherence 가 낮을 수 있습니다.',
        perpRange: null,
    };

    const sbasGood = n >= 15 && spanDays >= 180;
    const sbasFair = n >= 8 && spanDays >= 90;
    const sbas: Recommendation = {
        type: 'SBAS',
        suitability: sbasGood ? 'good' : sbasFair ? 'fair' : 'poor',
        sceneIds: stackIds,
        sceneCount: stackIds.length,
        spanLabel,
        reason: sbasGood
            ? `${n}장·${spanLabel} 으로 분산 산란체 시계열을 안정적으로 추정할 수 있습니다.`
            : sbasFair
              ? '데이터가 다소 부족하지만 추세 파악은 가능합니다(권장: 15장·6개월 이상).'
              : 'scene·기간이 부족해 SBAS 시계열은 신뢰가 어렵습니다.',
        perpRange: stackPerp,
    };

    const psiGood = n >= 25 && spanYears >= 2;
    const psiFair = n >= 18 && spanYears >= 1;
    const psi: Recommendation = {
        type: 'PSInSAR',
        suitability: psiGood ? 'good' : psiFair ? 'fair' : 'poor',
        sceneIds: stackIds,
        sceneCount: stackIds.length,
        spanLabel,
        reason: psiGood
            ? `${n}장·${spanLabel} 으로 영구 산란체 통계가 충분합니다(도심·구조물에 강함).`
            : psiFair
              ? '동작은 하지만 PS 밀도·정밀도를 위해 25장·2년 이상을 권장합니다.'
              : '장수·기간이 부족해 PS 후보 통계가 약합니다.',
        perpRange: stackPerp,
    };

    const rank: Record<Suitability, number> = { good: 0, fair: 1, poor: 2 };
    return [dinsar, sbas, psi].sort((a, b) => rank[a.suitability] - rank[b.suitability]);
}

let requestSeq = 0;

export const mockInsarRequestService: IInsarRequestService = {
    async 가용_씬을_조회한다(params) {
        // scene 가져오기 시뮬레이션 — Context 가 지도 오버레이를 띄울 시간.
        await delay(180);
        const scenes = generateAvailableScenes(params);
        return {
            success: true,
            message: `${scenes.length}개 scene 가용`,
            data: scenes,
        };
    },

    async 기법_적합도를_평가한다(params) {
        await delay(120);
        const recs = assessMethods(params);
        return {
            success: true,
            message: recs.length ? `${recs.length}개 기법 적합도 평가` : '평가할 데이터가 없습니다',
            data: recs,
        };
    },

    async InSAR_요청을_제출한다(params) {
        // 요청 접수 시뮬레이션.
        await delay(700);
        requestSeq += 1;
        const type: AnalysisType = params.form.type;
        return {
            success: true,
            message: `${type} "${params.form.name}" — ${params.sceneIds.length}개 scene 으로 요청 접수`,
            data: {
                requestId: `REQ-${Date.now()}-${requestSeq}`,
                type,
                sceneCount: params.sceneIds.length,
            },
        };
    },
};
