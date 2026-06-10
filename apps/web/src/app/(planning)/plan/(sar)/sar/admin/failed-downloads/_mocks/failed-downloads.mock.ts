/**
 * 실패한 다운로드 Planning Mock (클라이언트 메모리 상태)
 *
 * 모듈 스코프에 상태를 보관해, SWR 재검증(mutate) 시 변경이 반영되도록 한다.
 */
import type { IFailedDownloadsService } from '../_services/failed-downloads.service.interface';
import type { FailedDownloadsUI } from './failed-downloads.ui-interface';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let jobs: FailedDownloadsUI.FailedJob[] = [
    {
        id: 'job-58805',
        scene: 'S1A_IW_SLC__1SDV_20260410T092505',
        productKind: 'SLC',
        size: '4.0 GB',
        user: '김연구원',
        email: 'kim@ksit.re.kr',
        failedAt: '2026-04-24 07:54',
        attempts: 3,
        kind: 'CDSE_5XX',
        detail: 'CDSE 504 Gateway Timeout — OData token endpoint',
    },
    {
        id: 'job-58791',
        scene: 'S1A_IW_GRDH_1SDV_20260408T211855',
        productKind: 'GRD',
        size: '1.7 GB',
        user: '박지수',
        email: 'park@ksit.re.kr',
        failedAt: '2026-04-24 05:12',
        attempts: 2,
        kind: 'CHECKSUM',
        detail: 'MD5 mismatch — partial download (94%)',
    },
    {
        id: 'job-58772',
        scene: 'S1C_IW_SLC__1SDV_20260405T093122',
        productKind: 'SLC',
        size: '4.3 GB',
        user: '최윤라',
        email: 'choi@univ.ac.kr',
        failedAt: '2026-04-24 04:48',
        attempts: 5,
        kind: 'NAS_FULL',
        detail: 'NAS 잔여 용량 부족 (17.4 TB 한계 초과)',
    },
    {
        id: 'job-58765',
        scene: 'S1A_WV_OCN__2SSV_20260403T141022',
        productKind: 'OCN',
        size: '12 MB',
        user: '이민호',
        email: 'lee@labs.kr',
        failedAt: '2026-04-24 03:21',
        attempts: 1,
        kind: 'AUTH',
        detail: 'CDSE refresh_token expired',
    },
    {
        id: 'job-58758',
        scene: 'S1A_S6_RAW__0SDV_20260402T031244',
        productKind: 'RAW',
        size: '1.1 GB',
        user: '김연구원',
        email: 'kim@ksit.re.kr',
        failedAt: '2026-04-23 23:08',
        attempts: 4,
        kind: 'NETWORK',
        detail: 'TCP reset — CDN edge 노드 ko-1',
    },
];

export const mockFailedDownloadsService: IFailedDownloadsService = {
    async 실패_다운로드_목록을_조회한다() {
        await delay(120);
        return { success: true, message: '실패 다운로드 목록 조회 성공', data: { jobs: [...jobs] } };
    },

    async 다운로드를_재시도한다(id) {
        await delay(120);
        const exists = jobs.some((j) => j.id === id);
        if (!exists) {
            return { success: false, message: `${id} 잡을 찾을 수 없습니다` };
        }
        // 재시도 큐로 보낸 잡은 목록에서 제거한다.
        jobs = jobs.filter((j) => j.id !== id);
        return { success: true, message: `${id} 재시도 큐에 추가됨` };
    },

    async 다운로드를_무시한다(id) {
        await delay(120);
        const exists = jobs.some((j) => j.id === id);
        if (!exists) {
            return { success: false, message: `${id} 잡을 찾을 수 없습니다` };
        }
        // 무시한 잡은 목록에서 제거한다. (감사 로그에는 남는다는 가정)
        jobs = jobs.filter((j) => j.id !== id);
        return { success: true, message: `${id} 처리됨` };
    },
};
