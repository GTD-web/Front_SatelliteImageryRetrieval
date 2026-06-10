import type { SearchUI } from '../_mocks/search.ui-interface';

/** 오늘 기준 preset 범위를 계산해 [start, end]를 반환. */
export function presetRange(preset: '1주' | '1개월' | '3개월' | '1년'): [Date, Date] {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    if (preset === '1주') start.setDate(end.getDate() - 7);
    else if (preset === '1개월') start.setMonth(end.getMonth() - 1);
    else if (preset === '3개월') start.setMonth(end.getMonth() - 3);
    else start.setFullYear(end.getFullYear() - 1);
    return [start, end];
}

export function buildDefaultFilters(): SearchUI.Filters {
    const [start, end] = presetRange('1개월');
    return {
        s1a: true,
        s1c: true,
        productMode: 'slc',
        grd: true,
        raw: false,
        pol: ['VV+VH'],
        passA: true,
        passD: true,
        nisarBands: ['L', 'S'],
        nisarProduct: 'RSLC',
        nisarPol: [],
        haveOnly: false,
        esaRefresh: false,
        startDate: start,
        endDate: end,
        datePreset: '1개월',
    };
}

export function buildDefaultS2Filters(): SearchUI.S2Filters {
    return { level: 'L2A', cloudMax: 30, bands: ['TCI'] };
}

/**
 * Platform 별로 다른 분기 — S1 은 기존 `Filters`, S2 는 별도 `S2Filters` 로 평가.
 * 그 외 플랫폼(Umbra/Capella/KOMPSAT)은 mock 카탈로그가 없으므로 항상 빈 결과.
 */
export function sceneMatches(
    s: SearchUI.Scene,
    f: SearchUI.Filters,
    platform: SearchUI.Platform,
    s2: SearchUI.S2Filters,
): boolean {
    if (platform === 'S1') {
        if (s.mission !== 'S1A' && s.mission !== 'S1C') return false;
        if (s.mission === 'S1A' && !f.s1a) return false;
        if (s.mission === 'S1C' && !f.s1c) return false;
        if (f.productMode === 'slc') {
            if (s.product !== 'SLC') return false;
        } else {
            if (s.product === 'SLC') return false;
            if (s.product === 'GRD' && !f.grd) return false;
            if (s.product === 'OCN') return false; // OCN 은 취급하지 않음
            if (s.product === 'RAW' && !f.raw) return false;
        }
        if (f.pol.length > 0 && (!s.pol || !f.pol.includes(s.pol))) return false;
        if (f.haveOnly && !s.have) return false;
        return true;
    }
    if (platform === 'S2') {
        // Sentinel-2 광학 — mission S2A/S2B/S2C, product L1C/L2A, cloudCover 검사.
        if (s.mission !== 'S2A' && s.mission !== 'S2B' && s.mission !== 'S2C') return false;
        if (s.product !== s2.level) return false;
        if (typeof s.cloudCover === 'number' && s.cloudCover > s2.cloudMax) return false;
        if (f.haveOnly && !s.have) return false;
        return true;
    }
    if (platform === 'nisar') {
        // NISAR — mission 'NISAR', mode 에 밴드(L/S), product RSLC/GSLC/GCOV.
        if (s.mission !== 'NISAR') return false;
        if (f.nisarBands.length > 0 && !f.nisarBands.includes(s.mode ?? '')) return false;
        if (s.product !== f.nisarProduct) return false;
        if (f.nisarPol.length > 0 && (!s.pol || !f.nisarPol.includes(s.pol))) return false;
        if (f.haveOnly && !s.have) return false;
        return true;
    }
    // umbra / capella / kompsat — 연동 미지원
    return false;
}

/** 검색어(scene id / region) 부분일치. */
export function matchesQuery(s: SearchUI.Scene, query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    return s.id.toLowerCase().includes(q) || s.region.toLowerCase().includes(q);
}

/** Date → YYYY-MM-DD (로컬 기준). */
export function fmtYmd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 페이지네이션 표시용 범위 — 7개 이하면 전부, 그 이상이면 1 … current-1 current current+1 … last 패턴. */
export function getPageRange(current: number, total: number): Array<number | '...'> {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: Array<number | '...'> = [1];
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
}

/** Sentinel-1 절대 orbit → 상대 orbit(track). 1A/1C 모두 175 cycle, 미션별 offset 적용. */
export function relativeOrbit(orbit: number | undefined, mission: string | undefined): number | null {
    if (!orbit) return null;
    const offset = mission === 'S1A' ? 73 : mission === 'S1C' ? 27 : 0;
    return ((((orbit - offset) % 175) + 175) % 175) + 1;
}

export function pct(n: number, total: number): number {
    if (!total) return 0;
    return Math.round((n / total) * 100);
}

export const PAGE_SIZE_OPTIONS = [4, 10, 20, 50] as const;
