/**
 * 관리자 대시보드 · UI 타입 (Plan / Current 공용)
 *
 * BE 응답 DTO 가 아니라, 화면이 소비하는 UI 모델만 정의한다.
 * Plan(Mock) 과 Current(실제 API) 가 동일하게 구현하는 계약의 기반 타입.
 */
import type { IconName } from '@/_ui/hifi';

export namespace DashboardUI {
    /** 공통 서비스 응답 (데이터 없음) */
    export interface ServiceResponse {
        success: boolean;
        message: string;
    }

    /** 공통 서비스 응답 (데이터 포함) */
    export interface ServiceResponseWithData<T = unknown> {
        success: boolean;
        data?: T;
        message: string;
    }

    /** 집계 시간 범위 */
    export type Range = '1h' | '24h' | '7d' | '30d';

    /** KPI 카드 톤 */
    export type KpiTone = 'warning' | 'up' | 'down' | 'neutral';

    /** 범위/새로고침 시드에 따라 이미 해석된 KPI 카드 1건 */
    export interface KpiCard {
        label: string;
        value: string | number;
        delta: string;
        tone: KpiTone;
        unit?: string;
        spark: number[];
    }

    /** Quick Action 카드 톤 */
    export type QuickActionTone = 'warning' | 'danger' | 'accent';

    /** Quick Action 1건 */
    export interface QuickAction {
        icon: IconName;
        label: string;
        count: number;
        tone: QuickActionTone;
        target: string;
    }

    /** 처리량 & 큐 적체 차트 데이터 (범위/시드 기준으로 해석됨) */
    export interface ThroughputChart {
        /** 바 차트 높이 목록 */
        bars: number[];
        /** 라인(큐 적체) y 좌표 목록 */
        linePoints: number[];
        /** x 축 라벨 (index, text) 목록 */
        labels: { index: number; text: string }[];
    }

    /** 실시간 이벤트 1건 (시각, 타입, 상태, 메시지) */
    export interface RealtimeEvent {
        time: string;
        type: string;
        status: string;
        message: string;
    }

    /** NAS 사용량 분포 1행 */
    export interface NasBreakdownRow {
        label: string;
        valueTb: number;
        color: string;
    }

    /** NAS 사용량 분포 + 합계/한계 */
    export interface NasUsage {
        rows: NasBreakdownRow[];
        usedTb: number;
        capacityTb: number;
    }

    /** 대시보드 요약 조회 파라미터 */
    export interface DashboardSummaryParams {
        range: Range;
        /** 새로고침 누적값 — KPI/sparkline/throughput 이 살짝 흔들리도록 시드로 사용 */
        shake: number;
    }

    /** 대시보드 요약 (화면이 그리는 모든 데이터 묶음) */
    export interface DashboardSummary {
        kpis: KpiCard[];
        throughput: ThroughputChart;
        quickActions: QuickAction[];
        events: RealtimeEvent[];
        nas: NasUsage;
    }
}
