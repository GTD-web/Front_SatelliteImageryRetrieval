/**
 * InSAR 분석 기법 상수 — 기법별 메타, 자동 파라미터, 적합도/임계 테이블.
 *
 * 사용자는 파라미터를 직접 만지지 않는다 — 유형만 고르면 권장값이 자동 적용되고
 * "자동 설정값" 패널에 읽기 전용으로 노출된다.
 */
import type { InsarRequestUI } from '../_mocks/insar-request.ui-interface';

type AnalysisType = InsarRequestUI.AnalysisType;
type Suitability = InsarRequestUI.Suitability;

export const ANALYSIS_META: Record<
    AnalysisType,
    { label: string; sub: string; minScenes: number; sceneRequirement: string }
> = {
    DInSAR: {
        label: 'DInSAR',
        sub: 'Differential — 두 시점 간 변위(이벤트 기반)',
        minScenes: 2,
        sceneRequirement: 'scene 2개 (master + slave)',
    },
    PSInSAR: {
        label: 'PSInSAR',
        sub: 'Persistent Scatterer — 도시·구조물 장기 변위',
        minScenes: 20,
        sceneRequirement: 'scene 20개 이상',
    },
    SBAS: {
        label: 'SBAS',
        sub: 'Small Baseline Subset — 분산형 산란체 시계열',
        minScenes: 15,
        sceneRequirement: 'scene 15개 이상',
    },
};

/**
 * 분석 유형별 자동 처리 파라미터.
 * 유형만 고르면 권장값이 자동 적용된다. 실제 정밀 튜닝은 백엔드 처리 시 수행.
 */
export const AUTO_PARAMS: Record<
    AnalysisType,
    {
        polarization: string;
        coherenceMin: number;
        temporalBaselineMaxDays: number;
        spatialBaselineMaxM: number;
        minScenes: number;
    }
> = {
    DInSAR: {
        polarization: 'VV+VH',
        coherenceMin: 0.5,
        temporalBaselineMaxDays: 24,
        spatialBaselineMaxM: 150,
        minScenes: 2,
    },
    PSInSAR: {
        polarization: 'VV',
        coherenceMin: 0.7,
        temporalBaselineMaxDays: 36,
        spatialBaselineMaxM: 200,
        minScenes: 20,
    },
    SBAS: {
        polarization: 'VV+VH',
        coherenceMin: 0.3,
        temporalBaselineMaxDays: 60,
        spatialBaselineMaxM: 200,
        minScenes: 15,
    },
};

export const SUITABILITY_META: Record<Suitability, { label: string; color: string }> = {
    good: { label: '권장', color: 'var(--success)' },
    fair: { label: '보통', color: 'var(--warning)' },
    poor: { label: '지양', color: 'var(--danger)' },
};

/**
 * SBAS/PSInSAR opt-out 모델의 "불량일" 판정 임계 (기준 대비 |B⊥|, m).
 * 넘으면 기하 디코릴레이션 위험이 커 자동 제외 후보로 본다.
 */
export const PERP_WARN_M = 150;

export interface AutoParamRow {
    label: string;
    value: string;
    info?: string;
}

/** 분석 유형별로 자동 적용되는 파라미터를 사용자에게 보여줄 행 목록으로 변환. */
export function autoParamRows(type: AnalysisType): AutoParamRow[] {
    const p = AUTO_PARAMS[type];
    if (type === 'DInSAR') {
        return [
            {
                label: '편광',
                value: p.polarization,
                info: '관측에 사용할 편파 조합. Sentinel-1 기본 수신 조합으로 자동 설정됩니다.',
            },
            {
                label: '최소 코히어런스',
                value: p.coherenceMin.toFixed(2),
                info: '픽셀별 위상 신뢰도 임계값(0~1). 이 값 미만 픽셀은 결과에서 마스킹됩니다. DInSAR 은 0.5 를 기본으로 합니다.',
            },
            {
                label: 'Master/Slave',
                value: 'scene 선택에서 2장',
                info: '아래 "scene 선택" 탭에서 두 scene 을 고르면 자동으로 master/slave 페어가 됩니다.',
            },
        ];
    }
    if (type === 'PSInSAR') {
        return [
            {
                label: '편광',
                value: p.polarization,
                info: 'PS 분석은 단일 편파(VV)로 충분하고 안정적입니다.',
            },
            {
                label: 'PS 코히어런스 임계값',
                value: p.coherenceMin.toFixed(2),
                info: 'PS 후보 식별에 쓰이는 시간 코히어런스 임계값. 보통 0.7 이상으로 안정한 점만 남깁니다.',
            },
            {
                label: '최소 scene 수',
                value: `${p.minScenes}장 이상`,
                info: 'PS 통계에 필요한 최소 acquisition 장수. 적으면 PS 후보가 부족해 신뢰가 떨어집니다.',
            },
            {
                label: 'Reference point',
                value: '자동 (가장 안정한 점)',
                info: 'PS 후보 중 시간 coherence 가 가장 높은(가장 안정한) 점을 기준점으로 자동 선택합니다.',
            },
        ];
    }
    return [
        {
            label: '편광',
            value: p.polarization,
            info: 'Sentinel-1 기본 수신 조합으로 자동 설정됩니다.',
        },
        {
            label: '최대 시간 베이스라인',
            value: `${p.temporalBaselineMaxDays}일`,
            info: 'interferogram 페어 두 scene 간 허용 최대 시간 차이. 길수록 페어 수는 늘지만 시간적 디코히어런스가 증가합니다.',
        },
        {
            label: '최대 공간 베이스라인',
            value: `${p.spatialBaselineMaxM}m`,
            info: '두 acquisition 의 위성 궤도 간 허용 최대 수직 거리(perpendicular baseline).',
        },
        {
            label: '최소 코히어런스',
            value: p.coherenceMin.toFixed(2),
            info: 'interferogram 픽셀 마스킹 임계값. SBAS 는 분산형 산란체도 보존하므로 낮은 값을 사용합니다.',
        },
    ];
}
