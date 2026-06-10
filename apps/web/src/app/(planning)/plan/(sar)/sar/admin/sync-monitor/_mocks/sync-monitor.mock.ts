/**
 * 동기화 모니터 Planning Mock (클라이언트 메모리 상태)
 */
import type { ISyncMonitorService } from '../_services/sync-monitor.service.interface';
import type { SyncMonitorUI } from './sync-monitor.ui-interface';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let runs: SyncMonitorUI.Run[] = [
    { aoi: 'Pohang_coast', started: '09:41:48', duration: '42s', fetched: 6, status: 'success' },
    { aoi: 'Gyeongju_basin', started: '09:30:12', duration: '38s', fetched: 2, status: 'success' },
    { aoi: 'Busan_port', started: '07:42:00', duration: '1m 14s', fetched: 12, status: 'success' },
    { aoi: 'Ulleungdo_full', started: '01:00:00', duration: '22s', fetched: 0, status: 'success' },
    { aoi: 'Gimhae_landslide', started: 'Yesterday 04:00', duration: '—', fetched: 0, status: 'warning' },
    {
        aoi: 'Seoul_metro',
        started: '07:30:00',
        duration: '12s',
        fetched: 0,
        status: 'failed',
        err: 'ESA 503 Service Unavailable',
    },
];

export const mockSyncMonitorService: ISyncMonitorService = {
    async 동기화_이력을_조회한다() {
        await delay(120);
        return { success: true, message: '동기화 이력 조회 성공', data: { runs: [...runs] } };
    },

    async AOI를_재시도한다(aoi) {
        // 실제 재시도 동기화 지연을 흉내낸다.
        await delay(2000);
        let updated: SyncMonitorUI.Run | undefined;
        runs = runs.map((r) => {
            if (r.aoi !== aoi) return r;
            updated = {
                ...r,
                status: 'success',
                started: new Date().toTimeString().slice(0, 8),
                duration: '34s',
                fetched: Math.floor(Math.random() * 8) + 1,
                err: undefined,
            };
            return updated;
        });
        if (!updated) {
            return { success: false, message: `${aoi} 실행 이력을 찾을 수 없습니다` };
        }
        return { success: true, message: `${aoi} 동기화 완료`, data: updated };
    },
};
