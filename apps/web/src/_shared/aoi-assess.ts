// ────────────────────────────────────────────────────────────────────────────
// AOI 사전검증 / 방법 추천 (P0) — 클라이언트 목(mock) 진단 로직
//
// 실제 백엔드(POST /aoi/assess)가 붙기 전까지, 그린 AOI 지오메트리로부터
// 토지피복·coherence·경사를 **결정론적으로** 의사계산해 품질을 진단하고
// InSAR 방법(DInSAR/SBAS/PSInSAR)을 추천한다.
//
// 동일 AOI → 동일 결과(결정론적). 규칙은 docs 의 r6 10m 혼합 토지피복 실패
// 사례를 반영한 v1 규칙 기반.
// ────────────────────────────────────────────────────────────────────────────

export type InsarMethod = 'DInSAR' | 'PSInSAR' | 'SBAS';

export type LandcoverKey = 'urban' | 'forest' | 'farmland' | 'water';

export type Quality = 'low' | 'medium' | 'high';

export interface Landcover {
    urban: number;
    forest: number;
    farmland: number;
    water: number;
}

export interface MethodSegment {
    /** 토지피복 종류 */
    cover: LandcoverKey;
    /** 한글 지역 라벨 */
    region: string;
    /** AOI 내 면적 비율 (0~1) */
    fraction: number;
    /** 적용할 기본 방법 (폼 반영용). water 는 null. */
    method: InsarMethod | null;
    /** 표시용 방법 라벨 (해상도 등 부연) */
    methodLabel: string;
    /** 이 영역에서 해당 방법의 예상 신뢰도 */
    estQuality: Quality;
}

export interface AoiAssessment {
    quality: Quality;
    coherenceMean: number;
    landcover: Landcover;
    slope: { meanDeg: number; steepFrac: number };
    areaKm2: number;
    warnings: string[];
    /** 전체 1순위 추천 방법 (폼에 바로 적용) */
    primaryMethod: InsarMethod;
    primaryRationale: string;
    /** 토지피복별 방법 매핑 (방법 추천 표) */
    segments: MethodSegment[];
    /** 통째 처리 + masking 옵션 안내 */
    maskNote: string;
}

export const LANDCOVER_META: Record<LandcoverKey, { label: string; region: string; color: string }> = {
    urban: { label: '도심', region: '도심부', color: '#f87171' },
    forest: { label: '산림', region: '산림', color: '#34d399' },
    farmland: { label: '농경지', region: '농경지', color: '#fbbf24' },
    water: { label: '수계', region: '수계', color: '#60a5fa' },
};

export const QUALITY_META: Record<Quality, { label: string; color: string }> = {
    high: { label: '높음', color: 'var(--success)' },
    medium: { label: '보통', color: 'var(--warning)' },
    low: { label: '낮음', color: 'var(--danger)' },
};

// ── 결정론적 PRNG ────────────────────────────────────────────────────────────

/** FNV-1a 해시 — AOI ring 좌표(소수 3자리)로부터 안정적인 시드 생성. */
function hashRing(ring: Array<[number, number]>): number {
    let h = 2166136261;
    for (const [lon, lat] of ring) {
        h ^= Math.round(lon * 1000) | 0;
        h = Math.imul(h, 16777619);
        h ^= Math.round(lat * 1000) | 0;
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** mulberry32 — 시드 기반 결정론적 난수 [0,1). */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** ring bbox 면적을 km² 로 근사 (위도 기반 경도 보정). */
function bboxAreaKm2(ring: Array<[number, number]>): number {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }
    const midLat = (minLat + maxLat) / 2;
    const kmPerDegLat = 111.32;
    const kmPerDegLon = 111.32 * Math.cos((midLat * Math.PI) / 180);
    return Math.abs((maxLat - minLat) * kmPerDegLat * (maxLon - minLon) * kmPerDegLon);
}

// ── 진단 본체 ────────────────────────────────────────────────────────────────

/** AOI ring(GeoJSON 외곽선, [lon,lat][]) 으로부터 결정론적 사전검증 결과를 만든다. */
export function assessAoi(ring: Array<[number, number]>): AoiAssessment {
    const rng = mulberry32(hashRing(ring));

    // 1) 토지피복 비율 — 4개 가중치를 뽑아 정규화. 가끔 한 종류가 우세하도록 편향.
    const raw = {
        urban: Math.pow(rng(), 1.4),
        forest: Math.pow(rng(), 0.8) * 1.3, // 산림이 우세하기 쉽게 (한국 산지 비율 반영)
        farmland: Math.pow(rng(), 1.2),
        water: Math.pow(rng(), 2.2) * 0.5, // 수계는 작게
    };
    const sum = raw.urban + raw.forest + raw.farmland + raw.water || 1;
    const landcover: Landcover = {
        urban: raw.urban / sum,
        forest: raw.forest / sum,
        farmland: raw.farmland / sum,
        water: raw.water / sum,
    };

    // 2) coherence — 토지피복 가중 + 약간의 노이즈. 산림/수계는 낮음.
    const coherenceMean = clamp01(
        landcover.urban * 0.62 +
            landcover.farmland * 0.46 +
            landcover.forest * 0.16 +
            landcover.water * 0.08 +
            (rng() - 0.5) * 0.08,
    );

    // 3) 경사 — 산림 비율과 상관. 급경사 비율은 산림에서 높음.
    const meanDeg = +(3 + landcover.forest * 26 + rng() * 6).toFixed(1);
    const steepFrac = clamp01(landcover.forest * 0.55 + (rng() - 0.3) * 0.2);

    const areaKm2 = +bboxAreaKm2(ring).toFixed(1);

    // 4) 품질 등급
    const dominantFrac = Math.max(landcover.urban, landcover.forest, landcover.farmland, landcover.water);
    const mixed = landcover.urban > 0.25 && landcover.forest > 0.25;
    const heterogeneous = dominantFrac < 0.5;
    let quality: Quality =
        coherenceMean >= 0.5 && !mixed ? 'high' : coherenceMean >= 0.32 ? 'medium' : 'low';
    if (quality === 'high' && (mixed || heterogeneous)) quality = 'medium';

    // 5) 경고 — 규칙 기반
    const pct = (v: number) => Math.round(v * 100);
    const warnings: string[] = [];
    if (landcover.forest > 0.5) {
        warnings.push(
            `AOI 의 ${pct(landcover.forest)}% 가 산림 — SBAS coherence 낮음, 10m unwrapping 실패 위험 (유사 사례: r6 10m).`,
        );
    }
    if (mixed) {
        warnings.push(
            `도심(${pct(landcover.urban)}%)·산림(${pct(landcover.forest)}%) 혼재 — 단일 방법으론 한쪽이 신뢰 불가. 분할 또는 방법 분리 권장.`,
        );
    }
    if (steepFrac > 0.3) {
        warnings.push(`급경사 비율 ${pct(steepFrac)}% — layover/shadow 가능성, 단기 DInSAR 권장.`);
    }
    if (landcover.water > 0.3) {
        warnings.push(`수계 ${pct(landcover.water)}% — 위상 신뢰 불가, 수계 마스킹 필요.`);
    }
    if (coherenceMean < 0.3) {
        warnings.push(`평균 coherence ${coherenceMean.toFixed(2)} — 시계열 unwrapping 신뢰 낮음.`);
    }
    if (warnings.length === 0) {
        warnings.push('뚜렷한 위험 요소 없음 — 표준 처리 가능.');
    }

    // 6) 토지피복별 방법 매핑 (비율 ≥ 0.12 인 종류만)
    const segOf = (cover: LandcoverKey): MethodSegment | null => {
        const fraction = landcover[cover];
        if (fraction < 0.12) return null;
        const meta = LANDCOVER_META[cover];
        switch (cover) {
            case 'urban':
                return {
                    cover,
                    region: meta.region,
                    fraction,
                    method: coherenceMean > 0.4 ? 'PSInSAR' : 'SBAS',
                    methodLabel: coherenceMean > 0.4 ? 'PSInSAR (점 산란체)' : 'SBAS 10m',
                    estQuality: coherenceMean > 0.45 ? 'high' : 'medium',
                };
            case 'farmland':
                return {
                    cover,
                    region: meta.region,
                    fraction,
                    method: 'SBAS',
                    methodLabel: 'SBAS 10m',
                    estQuality: coherenceMean > 0.4 ? 'high' : 'medium',
                };
            case 'forest':
                return {
                    cover,
                    region: meta.region,
                    fraction,
                    method: 'SBAS',
                    methodLabel: 'SBAS 거친 28m + masking (또는 제외)',
                    estQuality: 'low',
                };
            case 'water':
                return {
                    cover,
                    region: meta.region,
                    fraction,
                    method: null,
                    methodLabel: '마스킹 (분석 제외)',
                    estQuality: 'low',
                };
        }
    };
    const segments = (['urban', 'farmland', 'forest', 'water'] as LandcoverKey[])
        .map(segOf)
        .filter((s): s is MethodSegment => s !== null)
        .sort((a, b) => b.fraction - a.fraction);

    // 7) 전체 1순위 방법 + 근거
    let primaryMethod: InsarMethod;
    let primaryRationale: string;
    const dominant = segments[0];
    if (mixed) {
        primaryMethod = coherenceMean > 0.4 ? 'PSInSAR' : 'SBAS';
        primaryRationale =
            '혼합 토지피복 — 도심부에 한정해 PSInSAR 적용을 권장합니다. AOI 분할 후 영역별 방법 분리가 이상적입니다.';
    } else if (dominant?.cover === 'urban') {
        primaryMethod = coherenceMean > 0.4 ? 'PSInSAR' : 'SBAS';
        primaryRationale = '도심 우세 — 구조물 점 산란체 기반 PSInSAR 가 적합합니다.';
    } else if (dominant?.cover === 'forest') {
        primaryMethod = 'SBAS';
        primaryRationale =
            '산림 우세 — 10m 고해상도는 실패 위험이 큽니다. 거친 28m SBAS + masking 또는 산림 영역 제외를 권장합니다.';
    } else if (dominant?.cover === 'farmland') {
        primaryMethod = 'SBAS';
        primaryRationale = '농경지 우세 — 분산 산란체 시계열(SBAS)이 적합합니다.';
    } else {
        primaryMethod = 'SBAS';
        primaryRationale = '수계 비중이 큼 — 수계 마스킹 후 잔여 영역에 SBAS 적용을 권장합니다.';
    }
    if (steepFrac > 0.45) {
        primaryRationale += ' 급경사 비율이 높아 단기 DInSAR(이벤트 기반)도 고려하세요.';
    }

    // 8) masking 안내 — 신뢰 픽셀 비율을 coherence 로 근사
    const reliableFrac = pct(clamp01(coherenceMean * 1.1));
    const maskNote = `통째 처리 + temporal coherence < 0.5 masking 시 신뢰 가능 픽셀 약 ${reliableFrac}% 예상.`;

    return {
        quality,
        coherenceMean: +coherenceMean.toFixed(2),
        landcover,
        slope: { meanDeg, steepFrac: +steepFrac.toFixed(2) },
        areaKm2,
        warnings,
        primaryMethod,
        primaryRationale,
        segments,
        maskNote,
    };
}
