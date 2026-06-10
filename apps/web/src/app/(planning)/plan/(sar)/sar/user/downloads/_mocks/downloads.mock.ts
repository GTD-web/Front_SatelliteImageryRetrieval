/**
 * 내 다운로드 Planning Mock (클라이언트 메모리 상태)
 *
 * 모듈 스코프에 상태를 보관해, SWR 재검증(mutate) 시 변경이 반영되도록 한다.
 * NAS 스테이징 진행/큐 충원은 시뮬레이션 mutation 으로 모듈 상태를 변경한다.
 */
import type { IDownloadsService } from '../_services/downloads.service.interface';
import type { DownloadsUI } from './downloads.ui-interface';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 진행 시뮬레이션 시 GRD/RAW 는 SLC 보다 빠르게 스테이징 완료된다 (실제 NAS 복사 속도 차이 반영) */
const PROGRESS_STEP: Record<DownloadsUI.ProductKind, number> = {
    SLC: 2,
    GRD: 5,
    RAW: 6,
};

/** 동시 NAS 스테이징 슬롯 수 — 잡 종류 무관 공용 큐 */
const MAX_PARALLEL_STAGING = 3;

function formatDateTime(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

let jobs: DownloadsUI.Job[] = [
    {
        id: 'job-58821',
        scene: 'S1A_IW_GRDH_1SDV_20260418T211515',
        productKind: 'GRD',
        status: 'running',
        progress: 62,
        size: '1.6 GB',
        started: '2026-04-27 09:42',
        finished: '—',
        eta: '3분',
        user: '본인',
    },
    {
        id: 'job-58820',
        scene: 'S1C_IW_SLC__1SDV_20260417T092258',
        productKind: 'SLC',
        status: 'running',
        progress: 34,
        size: '4.1 GB',
        started: '2026-04-27 09:40',
        finished: '—',
        eta: '6분',
        user: '본인',
    },
    {
        id: 'job-58819',
        scene: 'S1A_IW_SLC__1SDV_20260413T212030',
        productKind: 'SLC',
        status: 'queued',
        progress: 0,
        size: '4.3 GB',
        started: '—',
        finished: '—',
        eta: '대기',
        user: '본인',
    },
    {
        id: 'job-58814',
        scene: 'S1A_S6_RAW__0SDV_20260414T031244',
        productKind: 'RAW',
        status: 'queued',
        progress: 0,
        size: '1.1 GB',
        started: '—',
        finished: '—',
        eta: '대기',
        user: '본인',
    },
    {
        id: 'job-58812',
        scene: 'S1A_IW_SLC__1SDV_20260415T093105',
        productKind: 'SLC',
        status: 'done',
        progress: 100,
        size: '4.2 GB',
        started: '2026-04-27 08:15',
        finished: '2026-04-27 08:21',
        eta: '완료',
        user: '본인',
    },
    {
        id: 'job-58810',
        scene: 'S1A_IW_GRDH_1SDV_20260408T211855',
        productKind: 'GRD',
        status: 'done',
        progress: 100,
        size: '1.7 GB',
        started: '2026-04-27 07:32',
        finished: '2026-04-27 07:35',
        eta: '완료',
        user: '본인',
    },
    {
        id: 'job-58808',
        scene: 'S1A_S3_RAW__0SDV_20260406T031018',
        productKind: 'RAW',
        status: 'done',
        progress: 100,
        size: '0.9 GB',
        started: '2026-04-27 07:08',
        finished: '2026-04-27 07:10',
        eta: '완료',
        user: '본인',
    },
    {
        id: 'job-58805',
        scene: 'S1A_IW_SLC__1SDV_20260410T092505',
        productKind: 'SLC',
        status: 'failed',
        progress: 48,
        size: '4.0 GB',
        started: '2026-04-27 07:50',
        finished: '2026-04-27 07:54',
        eta: 'CDSE 504',
        user: '본인',
    },
];

export const mockDownloadsService: IDownloadsService = {
    async 다운로드_잡_목록을_조회한다() {
        await delay(120);
        return { success: true, message: '다운로드 잡 목록 조회 성공', data: { jobs: [...jobs] } };
    },

    async 스테이징_진행을_시뮬레이션한다() {
        // NAS 스테이징 진행 시뮬레이션 — 모든 product 종류에 동일 로직 적용
        jobs = jobs.map((j) => {
            if (j.status !== 'running') return j;
            const step = PROGRESS_STEP[j.productKind] ?? 2;
            const next = Math.min(100, j.progress + step + Math.floor(Math.random() * 3));
            if (next >= 100) {
                return {
                    ...j,
                    progress: 100,
                    status: 'done',
                    eta: '완료',
                    finished: formatDateTime(new Date()),
                };
            }
            const remaining = Math.round(((100 - next) / Math.max(1, step)) * 0.6);
            return { ...j, progress: next, eta: `${remaining}분` };
        });
        return { success: true, message: '스테이징 진행 갱신', data: { jobs: [...jobs] } };
    },

    async 대기_잡을_시작한다() {
        // 큐에서 대기 잡을 슬롯이 비면 시작
        const running = jobs.filter((j) => j.status === 'running').length;
        if (running >= MAX_PARALLEL_STAGING) {
            return { success: true, message: '여유 슬롯 없음', data: { jobs: [...jobs] } };
        }
        const idx = jobs.findIndex((j) => j.status === 'queued');
        if (idx < 0) {
            return { success: true, message: '대기 잡 없음', data: { jobs: [...jobs] } };
        }
        const next = [...jobs];
        const job = next[idx];
        if (job) {
            next[idx] = {
                ...job,
                status: 'running',
                started: formatDateTime(new Date()),
                progress: 3,
                eta: '시작',
            };
            jobs = next;
        }
        return { success: true, message: '대기 잡 시작', data: { jobs: [...jobs] } };
    },

    async 다운로드를_재시도한다(id) {
        await delay(120);
        const exists = jobs.some((j) => j.id === id);
        if (!exists) {
            return { success: false, message: `${id} 잡을 찾을 수 없습니다` };
        }
        jobs = jobs.map((j) =>
            j.id === id
                ? { ...j, status: 'queued', progress: 0, eta: '대기', started: '—' }
                : j,
        );
        return { success: true, message: '재시도 대기열에 추가됨' };
    },

    async NAS에서_다운로드한다(id) {
        await delay(120);
        const job = jobs.find((j) => j.id === id);
        if (!job) {
            return { success: false, message: `${id} 잡을 찾을 수 없습니다` };
        }
        return { success: true, message: `${job.scene.slice(0, 30)} NAS → 로컬 다운로드 시작` };
    },
};
