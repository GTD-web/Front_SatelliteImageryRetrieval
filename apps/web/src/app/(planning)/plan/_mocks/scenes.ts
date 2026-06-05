import type { HifiScene } from '@/_shared/contexts/HifiCartContext';

/**
 * 대략적인 Sentinel-1 IW footprint (실제 약 250km × 170km, 궤도에 따라 기울어짐)을
 * 한반도 남동부 주요 도시 근방에 모사한 mock 데이터.
 * 각 ring 은 [lon, lat] 4각형 (시계 반대방향, 마지막에 첫 점 중복 없이).
 */

const REGION_CENTERS: Record<string, [number, number]> = {
    Pohang: [129.37, 36.02],
    Gyeongju: [129.22, 35.85],
    Busan: [129.08, 35.18],
    Ulsan: [129.31, 35.54],
    Gimhae: [128.88, 35.24],
    Seoul: [127.0, 37.55],
};

/** 중심점 기준 ~0.7°×0.45° 사각형을 `tilt`(도)만큼 기울여 ring 생성 */
function makeFootprint(region: string, tilt: number, widen = 1): Array<[number, number]> {
    const [cx, cy] = REGION_CENTERS[region] ?? [128.5, 36.0];
    const halfW = 0.35 * widen;
    const halfH = 0.22 * widen;
    const rad = (tilt * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // latitude scale factor: 1° longitude is smaller than 1° latitude at mid-lat
    const kx = 1 / Math.cos((cy * Math.PI) / 180);
    const corners: Array<[number, number]> = [
        [-halfW, -halfH],
        [halfW, -halfH],
        [halfW, halfH],
        [-halfW, halfH],
    ];
    return corners.map(([dx, dy]) => {
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        return [cx + rx * kx, cy + ry] as [number, number];
    });
}

export const MOCK_SCENES: HifiScene[] = [
    {
        id: 'S1A_IW_SLC__1SDV_20260420T092341_20260420T092408_058912_074A2B_C3D1',
        mission: 'S1A',
        mode: 'IW',
        product: 'SLC',
        pol: 'VV+VH',
        date: '2026-04-20 09:23',
        orbit: 58912,
        have: true,
        region: 'Pohang',
        size: '4.2 GB',
        footprint: makeFootprint('Pohang', -12),
    },
    {
        id: 'S1A_IW_GRDH_1SDV_20260418T211515_20260418T211540_058887_0749E2_8F4A',
        mission: 'S1A',
        mode: 'IW',
        product: 'GRD',
        pol: 'VV+VH',
        date: '2026-04-18 21:15',
        orbit: 58887,
        have: false,
        region: 'Gyeongju',
        size: '1.6 GB',
        footprint: makeFootprint('Gyeongju', -10),
    },
    {
        id: 'S1C_IW_SLC__1SDV_20260417T092258_20260417T092326_002134_003F81_AA01',
        mission: 'S1C',
        mode: 'IW',
        product: 'SLC',
        pol: 'VV+VH',
        date: '2026-04-17 09:22',
        orbit: 2134,
        have: true,
        region: 'Pohang',
        size: '4.1 GB',
        footprint: makeFootprint('Pohang', -14, 1.05),
    },
    {
        id: 'S1A_IW_GRDH_1SDV_20260415T093105_20260415T093132_058843_0748C1_1E7F',
        mission: 'S1A',
        mode: 'IW',
        product: 'GRD',
        pol: 'VV+VH',
        date: '2026-04-15 09:31',
        orbit: 58843,
        have: true,
        region: 'Busan',
        size: '1.7 GB',
        footprint: makeFootprint('Busan', -11),
    },
    {
        id: 'S1A_IW_SLC__1SDV_20260413T212030_20260413T212057_058814_074820_4455',
        mission: 'S1A',
        mode: 'IW',
        product: 'SLC',
        pol: 'VV+VH',
        date: '2026-04-13 21:20',
        orbit: 58814,
        have: false,
        region: 'Ulsan',
        size: '4.3 GB',
        footprint: makeFootprint('Ulsan', -13),
    },
    {
        id: 'S1C_IW_GRDH_1SDV_20260412T093412_20260412T093439_002098_003E92_B210',
        mission: 'S1C',
        mode: 'IW',
        product: 'GRD',
        pol: 'VV+VH',
        date: '2026-04-12 09:34',
        orbit: 2098,
        have: true,
        region: 'Gimhae',
        size: '1.6 GB',
        footprint: makeFootprint('Gimhae', -12),
    },
    {
        id: 'S1A_IW_SLC__1SDV_20260410T092505_20260410T092532_058770_074721_9C3B',
        mission: 'S1A',
        mode: 'IW',
        product: 'SLC',
        pol: 'VV',
        date: '2026-04-10 09:25',
        orbit: 58770,
        have: false,
        region: 'Seoul',
        size: '4.0 GB',
        footprint: makeFootprint('Seoul', -10),
    },
    {
        id: 'S1A_IW_GRDH_1SDV_20260408T211855_20260408T211922_058745_0746A5_D21F',
        mission: 'S1A',
        mode: 'IW',
        product: 'GRD',
        pol: 'VV+VH',
        date: '2026-04-08 21:18',
        orbit: 58745,
        have: true,
        region: 'Pohang',
        size: '1.7 GB',
        footprint: makeFootprint('Pohang', -10, 0.95),
    },
    // ── Sentinel-2 (광학) — 데모용 mock scene. mode 'MSI', product 'L1C'/'L2A',
    //    cloudCover 는 0–100 (%). pol/orbit 은 SAR 전용이라 비워둠.
    {
        id: 'S2A_MSIL2A_20260419T021541_N0511_R032_T52SDJ_20260419T044812',
        mission: 'S2A',
        mode: 'MSI',
        product: 'L2A',
        date: '2026-04-19 02:15',
        have: true,
        region: 'Pohang',
        size: '780 MB',
        footprint: makeFootprint('Pohang', 0, 0.9),
        cloudCover: 12,
    },
    {
        id: 'S2B_MSIL1C_20260416T021529_N0511_R032_T52SDH_20260416T044721_0001',
        mission: 'S2B',
        mode: 'MSI',
        product: 'L1C',
        date: '2026-04-16 02:15',
        have: false,
        region: 'Busan',
        size: '720 MB',
        footprint: makeFootprint('Busan', 0, 0.9),
        cloudCover: 48,
    },
    {
        id: 'S2A_MSIL2A_20260414T022551_N0511_R032_T52SEJ_20260414T045143',
        mission: 'S2A',
        mode: 'MSI',
        product: 'L2A',
        date: '2026-04-14 02:25',
        have: true,
        region: 'Seoul',
        size: '810 MB',
        footprint: makeFootprint('Seoul', 0, 0.9),
        cloudCover: 4,
    },
    // ── NISAR (NASA-ISRO SAR) — L/S 듀얼밴드 SAR (12일 재방문, swath 242km).
    //    mode 에 밴드(L/S), product 는 RSLC(Range-Doppler SLC) / GSLC(Geocoded SLC) / GCOV(Geocoded Covariance).
    //    pol: single(HH/VV) · dual(HH+HV / VV+VH) · quad(HH+HV+VH+VV) · compact(RH+RV).
    {
        id: 'NISAR_L_RSLC_20260419T0930_PHNG_0001',
        mission: 'NISAR',
        mode: 'L',
        product: 'RSLC',
        pol: 'HH+HV',
        date: '2026-04-19 09:30',
        have: true,
        region: 'Pohang',
        size: '6.4 GB',
        footprint: makeFootprint('Pohang', -8, 1.1),
    },
    {
        id: 'NISAR_L_RSLC_20260407T0930_GJEO_0002',
        mission: 'NISAR',
        mode: 'L',
        product: 'RSLC',
        pol: 'HH+HV',
        date: '2026-04-07 09:30',
        have: true,
        region: 'Gyeongju',
        size: '6.3 GB',
        footprint: makeFootprint('Gyeongju', -8, 1.1),
    },
    {
        id: 'NISAR_S_RSLC_20260419T0931_PHNG_0003',
        mission: 'NISAR',
        mode: 'S',
        product: 'RSLC',
        pol: 'VV+VH',
        date: '2026-04-19 09:31',
        have: false,
        region: 'Pohang',
        size: '5.1 GB',
        footprint: makeFootprint('Pohang', -8, 1.0),
    },
    {
        id: 'NISAR_L_GSLC_20260407T0930_ULSN_0004',
        mission: 'NISAR',
        mode: 'L',
        product: 'GSLC',
        pol: 'HH+HV',
        date: '2026-04-07 09:30',
        have: false,
        region: 'Ulsan',
        size: '5.5 GB',
        footprint: makeFootprint('Ulsan', -8, 1.1),
    },
    {
        id: 'NISAR_L_GCOV_20260326T0930_BSAN_0005',
        mission: 'NISAR',
        mode: 'L',
        product: 'GCOV',
        pol: 'HH+HV+VH+VV',
        date: '2026-03-26 09:30',
        have: false,
        region: 'Busan',
        size: '3.2 GB',
        footprint: makeFootprint('Busan', -8, 1.1),
    },
    {
        id: 'NISAR_L_RSLC_20260419T0312_SEOU_0006',
        mission: 'NISAR',
        mode: 'L',
        product: 'RSLC',
        pol: 'HH',
        date: '2026-04-19 03:12',
        have: true,
        region: 'Seoul',
        size: '6.1 GB',
        footprint: makeFootprint('Seoul', -8, 1.1),
    },
    {
        id: 'NISAR_S_GSLC_20260407T0931_GMHE_0007',
        mission: 'NISAR',
        mode: 'S',
        product: 'GSLC',
        pol: 'VV',
        date: '2026-04-07 09:31',
        have: true,
        region: 'Gimhae',
        size: '4.4 GB',
        footprint: makeFootprint('Gimhae', -8, 1.0),
    },
];

/** Default AOI 링 (Pohang 해안) — 검색 페이지 초기 AOI 로 사용. 축에 정렬된 직사각형. */
export const MOCK_DEFAULT_AOI: Array<[number, number]> = [
    [129.25, 35.94],
    [129.54, 35.94],
    [129.54, 36.13],
    [129.25, 36.13],
    [129.25, 35.94],
];
