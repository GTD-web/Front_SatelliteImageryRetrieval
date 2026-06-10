/**
 * 크롤 대상(AOI) Planning Mock (클라이언트 메모리 상태)
 *
 * 모듈 스코프에 상태를 보관해, SWR 재검증(mutate) 시 변경이 반영되도록 한다.
 */
import type { ICrawlTargetsService } from '../_services/crawl-targets.service.interface';
import type { CrawlTargetsUI } from './crawl-targets.ui-interface';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let aois: CrawlTargetsUI.Aoi[] = [
    {
        name: 'Pohang_coast',
        owner: '시스템',
        scenes: 240,
        last: '3분 전',
        status: 'healthy',
        coords: [
            [129.25, 35.95],
            [129.52, 35.94],
            [129.54, 36.12],
            [129.27, 36.13],
        ],
    },
    {
        name: 'Gyeongju_basin',
        owner: '지진연구팀',
        scenes: 186,
        last: '12분 전',
        status: 'healthy',
        coords: [
            [129.1, 35.78],
            [129.34, 35.76],
            [129.36, 35.94],
            [129.12, 35.96],
        ],
    },
    {
        name: 'Busan_port',
        owner: '해양연구원',
        scenes: 312,
        last: '2시간 전',
        status: 'healthy',
        coords: [
            [128.96, 35.07],
            [129.21, 35.05],
            [129.22, 35.22],
            [128.97, 35.24],
        ],
    },
    {
        name: 'Ulleungdo_full',
        owner: '시스템',
        scenes: 48,
        last: '8시간 전',
        status: 'warning',
        coords: [
            [130.78, 37.4],
            [131.02, 37.4],
            [131.02, 37.58],
            [130.78, 37.58],
        ],
    },
    {
        name: 'Gimhae_landslide',
        owner: '재난연구원',
        scenes: 98,
        last: '28시간 전',
        status: 'stale',
        coords: [
            [128.78, 35.16],
            [128.99, 35.15],
            [129.0, 35.32],
            [128.79, 35.34],
        ],
    },
    {
        name: 'Seoul_metro',
        owner: '김연구원',
        scenes: 156,
        last: '실패',
        status: 'failed',
        coords: [
            [126.85, 37.45],
            [127.18, 37.43],
            [127.2, 37.65],
            [126.86, 37.66],
        ],
    },
];

function matchesKeyword(aoi: CrawlTargetsUI.Aoi, keyword?: string): boolean {
    if (!keyword) return true;
    const k = keyword.trim().toLowerCase();
    if (!k) return true;
    return aoi.name.toLowerCase().includes(k) || aoi.owner.toLowerCase().includes(k);
}

/** 그려서 추가할 때 AOI_001 형태의 충돌 없는 이름을 생성한다. */
function nextAoiName(): string {
    let seq = aois.filter((a) => a.name.startsWith('AOI_')).length + 1;
    const used = new Set(aois.map((a) => a.name));
    let name = `AOI_${String(seq).padStart(3, '0')}`;
    while (used.has(name)) {
        seq += 1;
        name = `AOI_${String(seq).padStart(3, '0')}`;
    }
    return name;
}

export const mockCrawlTargetsService: ICrawlTargetsService = {
    async AOI_목록을_조회한다(params) {
        await delay(120);
        const filtered = aois.filter((a) => matchesKeyword(a, params?.keyword));
        return { success: true, message: 'AOI 목록 조회 성공', data: { aois: filtered } };
    },

    async AOI를_크롤한다(name) {
        // 실제 ESA 동기화 지연을 흉내낸다.
        await delay(1800);
        let updated: CrawlTargetsUI.Aoi | undefined;
        aois = aois.map((a) => {
            if (a.name !== name) return a;
            updated = { ...a, last: '방금', status: 'healthy' };
            return updated;
        });
        if (!updated) {
            return { success: false, message: `${name} AOI 를 찾을 수 없습니다` };
        }
        return { success: true, message: `${name} 크롤 완료`, data: updated };
    },

    async AOI를_생성한다(input) {
        await delay(120);
        const created: CrawlTargetsUI.Aoi = {
            name: nextAoiName(),
            owner: input.owner ?? '김연구원',
            scenes: 0,
            last: '생성됨',
            status: 'healthy',
            coords: input.coords,
        };
        aois = [created, ...aois];
        return { success: true, message: `${created.name} 생성됨`, data: created };
    },
};
