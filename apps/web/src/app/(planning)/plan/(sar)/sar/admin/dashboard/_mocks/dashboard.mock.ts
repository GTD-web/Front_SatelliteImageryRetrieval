/**
 * 관리자 대시보드 Planning Mock (시드 기반 시뮬레이션)
 *
 * 원본 page.tsx 가 인라인으로 갖고 있던 KPI/throughput/event/NAS 계산 로직을
 * 그대로 이관한다. range/shake 를 입력받아 이미 해석된 DashboardSummary 를 돌려준다.
 */
import type { IDashboardService } from '../_services/dashboard.service.interface';
import type { DashboardUI } from './dashboard.ui-interface';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Range = DashboardUI.Range;

/** 모킹된 KPI/이벤트는 범위별 multiplier 로 값/추세를 다르게 시뮬레이션한다. */
const RANGE_MULT: Record<Range, number> = { '1h': 0.06, '24h': 1, '7d': 6.4, '30d': 24.8 };

interface KpiDef {
    label: string;
    /** 범위에 따라 값을 계산하는 함수. */
    value: (r: Range, shake: number) => string | number;
    delta: (r: Range) => string;
    tone: DashboardUI.KpiTone;
    unit?: string;
    spark: (r: Range, shake: number) => number[];
}

function buildSpark(seed: number, len = 7, base = 0, amp = 1, shake = 0): number[] {
    const out: number[] = [];
    let s = seed + Math.floor(shake * 1000);
    for (let i = 0; i < len; i++) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const v = base + amp * (0.5 + (s / 0x7fffffff - 0.5) + i / len);
        out.push(+v.toFixed(2));
    }
    return out;
}

const KPIS: KpiDef[] = [
    {
        label: '처리량',
        value: (r, sh) => Math.round(284 * RANGE_MULT[r] * (1 + sh * 0.04)),
        delta: (r) =>
            r === '1h' ? '+2 vs 직전 1h' : r === '24h' ? '+12% vs 어제' : r === '7d' ? '+18% vs 지난주' : '+9% vs 지난달',
        tone: 'up',
        unit: 'scenes',
        spark: (r, sh) => buildSpark(101, 7, 220 * RANGE_MULT[r], 80 * RANGE_MULT[r], sh),
    },
    {
        label: '실패율',
        value: (r, sh) => {
            const base = r === '1h' ? 1.4 : r === '24h' ? 2.1 : r === '7d' ? 2.6 : 2.9;
            return (base + sh * 0.4).toFixed(1);
        },
        delta: (r) =>
            r === '1h'
                ? '−0.2%p vs 직전 1h'
                : r === '24h'
                  ? '−0.4%p vs 어제'
                  : r === '7d'
                    ? '+0.1%p vs 지난주'
                    : '−0.3%p vs 지난달',
        tone: 'down',
        unit: '%',
        spark: (r, sh) => buildSpark(202, 7, r === '1h' ? 1 : 2, 1, sh),
    },
    {
        label: 'NAS 사용량',
        value: () => '42.6',
        delta: () => '/ 60 TB',
        tone: 'neutral',
        unit: 'TB',
        spark: (_r, sh) => buildSpark(303, 7, 40, 3, sh),
    },
    {
        label: '활성 사용자',
        value: (r, sh) => {
            const base = r === '1h' ? 12 : r === '24h' ? 38 : r === '7d' ? 142 : 386;
            return Math.round(base * (1 + sh * 0.05));
        },
        delta: (r) => (r === '1h' ? '직전 1h 8명' : r === '24h' ? '어제 35명' : r === '7d' ? '지난주 134명' : '지난달 371명'),
        tone: 'up',
        spark: (r, sh) => buildSpark(404, 7, r === '1h' ? 6 : 30, 8, sh),
    },
];

const QUICK_ACTIONS: DashboardUI.QuickAction[] = [
    { icon: 'refresh', label: 'Sync 실패 AOI', count: 3, tone: 'danger', target: '/plan/sar/admin/sync-monitor' },
    { icon: 'users', label: '신규 가입', count: 2, tone: 'accent', target: '/plan/sar/admin/users' },
    { icon: 'activity', label: '실패한 다운로드', count: 5, tone: 'danger', target: '/plan/sar/admin/failed-downloads' },
];

const ALL_EVENTS: [string, string, string, string, Range][] = [
    ['09:42:18', 'DOWNLOAD', 'completed', 'job-58817 · S1A_IW_GRDH_20260418 · 1.7 GB · 김연구원', '1h'],
    ['09:42:02', 'CART', 'submit', 'cart-req-221 · 148 scenes · 박지수', '1h'],
    ['09:41:48', 'SYNC', 'success', 'Pohang_coast · 6 new scenes', '1h'],
    ['09:41:33', 'LOGIN', 'success', 'choi@ksit.re.kr', '1h'],
    ['09:40:55', 'DOWNLOAD', 'running', 'job-58821 · S1A_IW_GRDH_20260418 · 67%', '1h'],
    ['09:40:12', 'DOWNLOAD', 'failed', 'job-58805 · CDSE 504 · 재시도 예약', '24h'],
    ['09:39:28', 'CART', 'submit', '32 scenes · 58.3 GB · lee@labs.kr', '24h'],
    ['09:38:14', 'SYNC', 'success', 'Gyeongju · 2 new scenes', '24h'],
    ['08:32:10', 'INSAR', 'completed', 'pohang-q4 DInSAR · 512 MB', '24h'],
    ['07:18:42', 'USER', 'created', 'yoon@ksit.re.kr (downloader)', '24h'],
    ['어제 22:14', 'DOWNLOAD', 'completed', 'job-58712 · 2.1 GB · 박지수', '7d'],
    ['어제 21:02', 'SYNC', 'failed', 'Seoul_metro · ESA 503', '7d'],
    ['3일 전', 'INSAR', 'completed', 'gyeongju-sbas · 14.2 GB', '7d'],
    ['12일 전', 'ROLE', 'change', 'jung@ksit.re.kr viewer → downloader', '30d'],
    ['22일 전', 'SYSTEM', 'maintenance', 'NAS 정기 점검 완료', '30d'],
];

const NAS_BREAKDOWN: [string, number, string][] = [
    ['S1A / SLC', 18.2, 'var(--accent)'],
    ['S1A / GRD', 12.8, 'var(--brand-2)'],
    ['S1C / SLC', 6.1, 'var(--success)'],
    ['S1C / GRD', 3.4, 'var(--warning)'],
    ['InSAR 산출', 2.1, 'var(--info)'],
];

function rangeWindow(r: Range): Set<Range> {
    // 더 긴 범위는 더 짧은 범위를 포함
    if (r === '1h') return new Set(['1h']);
    if (r === '24h') return new Set(['1h', '24h']);
    if (r === '7d') return new Set(['1h', '24h', '7d']);
    return new Set(['1h', '24h', '7d', '30d']);
}

/** 처리량 & 큐 적체 차트 데이터를 범위/시드 기준으로 생성한다. */
function buildThroughput(range: Range, shake: number): DashboardUI.ThroughputChart {
    /** 범위에 따라 bar 개수와 x 축 라벨이 달라지도록 구성. */
    const layout =
        range === '1h'
            ? { n: 12, labelStep: 3, labelFn: (i: number) => `${i * 5}m` }
            : range === '24h'
              ? { n: 24, labelStep: 6, labelFn: (i: number) => `${(i + 12) % 24}:00` }
              : range === '7d'
                ? { n: 7, labelStep: 1, labelFn: (i: number) => `D-${6 - i}` }
                : { n: 30, labelStep: 5, labelFn: (i: number) => `D-${29 - i}` };

    const seed = (shake + 1) * 17 + (range === '1h' ? 1 : range === '24h' ? 2 : range === '7d' ? 3 : 4);

    const bars = Array.from({ length: layout.n }).map(
        (_, i) => 30 + Math.sin((i + seed) / 3) * 20 + ((i * 37 + seed * 11) % 30),
    );
    const linePoints = Array.from({ length: layout.n }).map(
        (_, i) => 140 - Math.cos((i + seed) / 4) * 30 - (i > Math.floor(layout.n * 0.7) ? 20 : 0),
    );
    const labels = Array.from({ length: Math.ceil(layout.n / layout.labelStep) + 1 }).map((_, k) => {
        const i = Math.min(layout.n - 1, k * layout.labelStep);
        return { index: i, text: layout.labelFn(i) };
    });

    return { bars, linePoints, labels };
}

function buildSummary(params: DashboardUI.DashboardSummaryParams): DashboardUI.DashboardSummary {
    const { range, shake } = params;

    const kpis: DashboardUI.KpiCard[] = KPIS.map((k) => ({
        label: k.label,
        value: k.value(range, shake),
        delta: k.delta(range),
        tone: k.tone,
        unit: k.unit,
        spark: k.spark(range, shake),
    }));

    const window = rangeWindow(range);
    const events: DashboardUI.RealtimeEvent[] = ALL_EVENTS.filter(([, , , , bucket]) => window.has(bucket)).map(
        ([time, type, status, message]) => ({ time, type, status, message }),
    );

    const nas: DashboardUI.NasUsage = {
        rows: NAS_BREAKDOWN.map(([label, valueTb, color]) => ({ label, valueTb, color })),
        usedTb: 42.6,
        capacityTb: 60,
    };

    return {
        kpis,
        throughput: buildThroughput(range, shake),
        quickActions: [...QUICK_ACTIONS],
        events,
        nas,
    };
}

export const mockDashboardService: IDashboardService = {
    async 대시보드_요약을_조회한다(params) {
        await delay(120);
        return { success: true, message: '대시보드 요약 조회 성공', data: buildSummary(params) };
    },
};
