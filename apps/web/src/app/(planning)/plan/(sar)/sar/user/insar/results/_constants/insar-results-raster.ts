/**
 * InSAR 결과 뷰어 · 순수 계산 헬퍼 (래스터 합성 / 통계 / scene·시계열 생성)
 *
 * 실제 InSAR 산출물 대신 산출물 id 기반으로 결정적 mock 을 생성한다.
 * 레이어/컬러맵/범위 변화에 반응해 지도 오버레이 외관이 즉각 바뀌도록 의도.
 */
import type { InsarResultsUI } from '../_mocks/insar-results.ui-interface';
import { COLORMAP_STOPS, PRODUCT_CENTERS } from './insar-results-layers';

/** 산출물 미리보기 raster 가 깔리는 lon/lat 사각형. 중심 ± 약 25/18km 패치. */
export function productExtent(productId: string): [number, number, number, number] {
    const [lon, lat] = PRODUCT_CENTERS[productId] ?? [129.37, 36.02];
    const dLon = 0.25;
    const dLat = 0.18;
    return [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
}

/** 산출물별 핵심 지표(변위 통계) 결정적 mock. 실제로는 산출물 메타(래스터 통계)로 대체. */
export function statsForProduct(p: InsarResultsUI.InsarProduct): InsarResultsUI.ProductStats {
    let h = 0;
    for (let i = 0; i < p.id.length; i++) h = (h * 31 + p.id.charCodeAt(i)) >>> 0;
    const rnd = (k: number, lo: number, hi: number) => {
        const x = Math.sin((h % 997) + k * 131.71) * 10000;
        return lo + (x - Math.floor(x)) * (hi - lo);
    };
    const stack = p.type !== 'DInSAR';
    return {
        maxUpMm: rnd(1, -1, stack ? 8 : 4),
        maxDownMm: -rnd(2, stack ? 120 : 30, stack ? 750 : 90),
        avgRateMmYr: -rnd(3, 6, 110),
        meanCoherence: rnd(4, 0.45, 0.9),
        validPixelPct: rnd(5, 62, 96),
        areaKm2: rnd(6, 9, 55),
        points: Math.round(p.type === 'PSInSAR' ? rnd(7, 8000, 24000) : rnd(7, 1500, 7000)),
    };
}

/** 산출물 기간/타입 기반으로 원본 scene 목록을 생성한다(모달 표시용). */
export function generateScenes(product: InsarResultsUI.InsarProduct): InsarResultsUI.SceneItem[] {
    const [startStr] = product.range.split(' ~ ');
    const start = startStr.length >= 10 ? new Date(startStr) : new Date(`${startStr}-01`);
    const stepDays = 12;
    const polarization = 'VV+VH';
    const sceneSize = product.type === 'PSInSAR' || product.type === 'SBAS' ? '4.1 GB' : '1.7 GB';
    const missionPrefix = product.mission.includes('S1C') ? 'S1C' : 'S1A';
    const productSuffix = product.type === 'DInSAR' ? 'GRDH_1SDV' : 'SLC__1SDV';
    return Array.from({ length: product.scenes }).map((_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i * stepDays);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const id = `${missionPrefix}_IW_${productSuffix}_${yyyy}${mm}${dd}T211515_${yyyy}${mm}${dd}T211544_0${(i % 9) + 1}A123_2B${(i % 16).toString(16).padStart(2, '0').toUpperCase()}`;
        return {
            id,
            date: `${yyyy}-${mm}-${dd}`,
            role: i === 0 ? 'master' : 'slave',
            polarization,
            size: sceneSize,
        };
    });
}

/** seed 기반 결정적 시계열(mm) 생성 — 지도 클릭 점의 LOS 변위. */
export function simulateSeries(seed: number, len = 12): number[] {
    let s = seed;
    const out = [0];
    for (let i = 1; i < len; i++) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const trend = seed % 3 === 0 ? -2 : seed % 3 === 1 ? 1.1 : 0;
        const noise = (s / 0x7fffffff - 0.5) * 4;
        const prev = out[i - 1] ?? 0;
        out.push(+(prev + trend + noise).toFixed(1));
    }
    return out;
}

function sampleColormap(cm: InsarResultsUI.Colormap, t: number): [number, number, number] {
    const stops = COLORMAP_STOPS[cm];
    const u = t < 0 ? 0 : t > 1 ? 1 : t;
    const seg = u * (stops.length - 1);
    const i = Math.floor(seg);
    const f = seg - i;
    const a = stops[i] ?? stops[0]!;
    const b = stops[Math.min(stops.length - 1, i + 1)] ?? a;
    return [
        Math.round(a[0] + (b[0] - a[0]) * f),
        Math.round(a[1] + (b[1] - a[1]) * f),
        Math.round(a[2] + (b[2] - a[2]) * f),
    ];
}

/** 산출물 미리보기 레이어를 합성한다. 실제 InSAR 산출물 대신 시각적 데모용 패턴을 그린다.
 *  레이어/컬러맵/범위 변화에 반응해서 지도 위 오버레이 외관이 즉각 변하도록 의도. */
export function buildInsarRaster(opts: {
    productId: string;
    layer: InsarResultsUI.Layer;
    colormap: InsarResultsUI.Colormap;
    rangeMin: number;
    rangeMax: number;
}): string | null {
    if (typeof document === 'undefined') return null;
    const { productId, layer, colormap, rangeMin, rangeMax } = opts;
    const W = 256;
    const H = 256;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d');
    if (!ctx) return null;
    const img = ctx.createImageData(W, H);
    let seed = 1;
    for (const c of productId) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const sx = ((seed & 0xff) / 255 - 0.5) * 0.1;
    const sy = (((seed >> 8) & 0xff) / 255 - 0.5) * 0.1;
    const lo = Math.min(rangeMin, rangeMax);
    const hi = Math.max(rangeMin, rangeMax);
    const span = Math.max(1e-6, hi - lo);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const nx = x / W;
            const ny = y / H;
            const dx = nx - 0.5 + sx;
            const dy = ny - 0.5 + sy;
            const r = Math.hypot(dx, dy);
            const noise =
                (Math.sin((nx * 12 + (seed & 7)) * Math.PI) +
                    Math.sin((ny * 9 + ((seed >> 4) & 7)) * Math.PI) +
                    Math.sin(((nx + ny) * 18 + ((seed >> 8) & 7)) * Math.PI)) /
                3;
            let v: number;
            switch (layer) {
                case 'mean_velocity': {
                    const base = (lo + hi) / 2;
                    v = base + (hi - lo) * 0.5 * (-Math.exp(-r * 4) * 1.4 + noise * 0.3);
                    break;
                }
                case 'cumulative_disp': {
                    const base = (lo + hi) / 2;
                    v = base + (hi - lo) * 0.5 * (-Math.exp(-r * 3.4) * 1.6 + noise * 0.25);
                    break;
                }
                case 'coherence': {
                    v = 0.55 + noise * 0.35 - r * 0.5;
                    break;
                }
                case 'wrapped_phase': {
                    const ph = ((((nx * 14 + ny * 8 + r * 18 + noise * 2) % 2) + 2) % 2) - 1;
                    v = ph * Math.PI;
                    break;
                }
                default:
                    v = 0;
            }
            const t = (v - lo) / span;
            const [rr, gg, bb] = sampleColormap(colormap, t);
            const i = (y * W + x) * 4;
            img.data[i] = rr;
            img.data[i + 1] = gg;
            img.data[i + 2] = bb;
            img.data[i + 3] = 235;
        }
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
}
