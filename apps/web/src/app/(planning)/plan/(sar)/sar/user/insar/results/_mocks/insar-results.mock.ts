/**
 * InSAR 결과 뷰어 Planning Mock (클라이언트 메모리 상태)
 *
 * 원본 page.tsx 가 인라인으로 갖고 있던 완료 산출물 목록을 그대로 이관한다.
 * 모듈 스코프에 상태를 보관해, mutate 재검증 시 반영되도록 한다(다운로드 요청 누적 기록).
 */
import type { IInsarResultsService } from '../_services/insar-results.service.interface';
import type { InsarResultsUI } from './insar-results.ui-interface';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 완료된 산출물 목록 — 결과 뷰어가 소비하는 메모리 시드. */
const PRODUCTS: InsarResultsUI.InsarProduct[] = [
    {
        id: 'pohang-q4',
        name: 'Pohang subsidence 2025Q4',
        type: 'DInSAR',
        range: '2025-10-01 ~ 2025-12-30',
        mission: 'S1A',
        size: '512 MB',
        scenes: 2,
        owner: '김연구원',
    },
    {
        id: 'gyeongju-sbas',
        name: 'Gyeongju SBAS 2024-2025',
        type: 'SBAS',
        range: '2024-01 ~ 2025-12',
        mission: 'S1A',
        size: '14.2 GB',
        scenes: 38,
        owner: '박지수',
    },
    {
        id: 'gimhae',
        name: 'Gimhae 산사태 모니터',
        type: 'DInSAR',
        range: '2025-08-12 ~ 2025-08-24',
        mission: 'S1A',
        size: '498 MB',
        scenes: 2,
        owner: '이민호',
    },
    {
        id: 'busan-ps',
        name: 'Busan Port PSInSAR',
        type: 'PSInSAR',
        range: '2023-01 ~ 2025-12',
        mission: 'S1A·S1C',
        size: '142 MB',
        scenes: 86,
        owner: '최윤라',
    },
    {
        id: 'ulleung',
        name: 'Ulleungdo SBAS',
        type: 'SBAS',
        range: '2024-06 ~ 2026-03',
        mission: 'S1A',
        size: '8.7 GB',
        scenes: 28,
        owner: '시스템',
    },
    {
        id: 'daegu-ps',
        name: 'Daegu 도심 PSInSAR',
        type: 'PSInSAR',
        range: '2024-01 ~ 2026-05',
        mission: 'S1A·S1C',
        size: '96 MB',
        scenes: 54,
        owner: '김연구원',
    },
    {
        id: 'andong-sbas',
        name: 'Andong 댐 주변 SBAS',
        type: 'SBAS',
        range: '2024-09 ~ 2026-04',
        mission: 'S1A',
        size: '6.1 GB',
        scenes: 24,
        owner: '박지수',
    },
    {
        id: 'mokpo-q1',
        name: 'Mokpo 매립지 2026Q1',
        type: 'DInSAR',
        range: '2026-01-04 ~ 2026-03-29',
        mission: 'S1C',
        size: '487 MB',
        scenes: 2,
        owner: '시스템',
    },
];

/** 다운로드를 요청한 산출물 id — 다운로드 요청 누적을 모킹으로 기록만 한다. */
let downloadedIds: string[] = [];

export const mockInsarResultsService: IInsarResultsService = {
    async 결과_데이터를_조회한다() {
        await delay(120);
        return {
            success: true,
            message: 'InSAR 결과 데이터 조회 성공',
            data: { products: PRODUCTS.map((p) => ({ ...p })) },
        };
    },

    async 산출물_다운로드를_요청한다(productId) {
        await delay(120);
        downloadedIds = [...downloadedIds, productId];
        const product = PRODUCTS.find((p) => p.id === productId);
        return {
            success: true,
            message: `${product?.name ?? productId} 다운로드 시작`,
        };
    },
};
