/**
 * 저장된 AOI 라이브러리 Planning Mock (클라이언트 메모리 상태)
 *
 * 모듈 스코프에 상태를 보관해, SWR 재검증(mutate) 시 변경이 반영되도록 한다.
 */
import type { IAoisService } from '../_services/aois.service.interface';
import type { AoisUI } from './aois.ui-interface';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let aois: AoisUI.Aoi[] = [
    {
        id: 'seed-pohang',
        name: '포항 해안',
        description: '포항시 동해 연안 — 데모 기본 영역',
        nwLat: 36.13,
        nwLon: 129.25,
        seLat: 35.94,
        seLon: 129.54,
        createdAt: '2026-04-01T00:00:00.000Z',
    },
    {
        id: 'seed-gyeongju',
        name: '경주 시내',
        description: '2016 경주 지진 일대',
        nwLat: 35.92,
        nwLon: 129.18,
        seLat: 35.78,
        seLon: 129.32,
        createdAt: '2026-03-15T00:00:00.000Z',
    },
    {
        id: 'seed-gimhae',
        name: '김해 산사태',
        description: '여름 집중 모니터링 권역',
        nwLat: 35.3,
        nwLon: 128.8,
        seLat: 35.18,
        seLon: 128.96,
        createdAt: '2026-02-20T00:00:00.000Z',
    },
];

function matchesKeyword(aoi: AoisUI.Aoi, keyword?: string): boolean {
    if (!keyword) return true;
    const k = keyword.trim().toLowerCase();
    if (!k) return true;
    return aoi.name.toLowerCase().includes(k) || (aoi.description ?? '').toLowerCase().includes(k);
}

function generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `aoi-${crypto.randomUUID().slice(0, 8)}`;
    }
    return `aoi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const mockAoisService: IAoisService = {
    async AOI_목록을_조회한다(params) {
        await delay(120);
        const filtered = aois.filter((a) => matchesKeyword(a, params?.keyword));
        return { success: true, message: 'AOI 목록 조회 성공', data: { aois: filtered } };
    },

    async AOI를_등록한다(input) {
        await delay(120);
        const created: AoisUI.Aoi = {
            id: generateId(),
            name: input.name,
            description: input.description,
            nwLat: input.nwLat,
            nwLon: input.nwLon,
            seLat: input.seLat,
            seLon: input.seLon,
            createdAt: new Date().toISOString(),
        };
        // 같은 이름이 이미 있으면 새 항목으로 덮어씀(가장 최근 것을 위로)
        const filtered = aois.filter((a) => a.name !== input.name);
        aois = [created, ...filtered];
        return { success: true, message: `"${created.name}" 등록됨`, data: created };
    },

    async AOI를_수정한다(input) {
        await delay(120);
        let updated: AoisUI.Aoi | undefined;
        aois = aois.map((a) => {
            if (a.id !== input.id) return a;
            updated = { ...a, name: input.name, description: input.description };
            return updated;
        });
        if (!updated) {
            return { success: false, message: 'AOI 를 찾을 수 없습니다' };
        }
        return { success: true, message: `"${updated.name}" 으로 변경됨`, data: updated };
    },

    async AOI를_삭제한다(id) {
        await delay(120);
        const before = aois.length;
        aois = aois.filter((a) => a.id !== id);
        if (aois.length === before) {
            return { success: false, message: 'AOI 를 찾을 수 없습니다' };
        }
        return { success: true, message: 'AOI 삭제됨' };
    },
};
