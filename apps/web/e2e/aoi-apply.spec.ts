import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1600, height: 1000 } });

/**
 * AOI 관리 페이지에서 "검색에 적용" 누르면 검색 페이지가 해당 AOI 로 줌인 + 즉시 scene 검색을 시작
 * (검색 중… 오버레이가 떠야 한다 — InSAR 의 "사용 가능한 scene 가져오는 중…" 과 같은 UX).
 */
test('검색에 적용 직후 "scene 검색 중…" 오버레이가 뜬다', async ({ page }) => {
    await page.goto('/plan/sar/user/aois', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.locator('.card', { hasText: '경주 시내' }).locator('button', { hasText: '검색에 적용' }).click();
    await page.waitForURL(/\/sar\/user\/search/);
    // executeSearch 는 800ms 동안 isSearching=true. 그 안에 오버레이가 보여야 함.
    await expect(page.getByText('scene 검색 중…')).toBeVisible({ timeout: 1000 });
    // 검색 완료 후 결과 토스트가 떠야 함.
    await expect(page.getByText(/\d+개 scene 검색 결과/)).toBeVisible({ timeout: 3000 });
});

test('검색 — 서로 다른 AOI 는 서로 다른 줌인 결과', async ({ page }) => {
    async function captureCanvasHash() {
        return await page.evaluate(() => {
            const canvas = document.querySelector('.ol-viewport canvas') as HTMLCanvasElement | null;
            if (!canvas) return '';
            const ctx = canvas.getContext('2d');
            if (!ctx) return '';
            const x = Math.floor(canvas.width * 0.6);
            const y = Math.floor(canvas.height * 0.2);
            const w = Math.floor(canvas.width * 0.3);
            const h = Math.floor(canvas.height * 0.3);
            try {
                const data = ctx.getImageData(x, y, w, h).data;
                let hash = 0;
                for (let i = 0; i < data.length; i += 64) hash = (hash * 31 + data[i]!) | 0;
                return String(hash);
            } catch {
                return '';
            }
        });
    }
    async function clickApply(name: string) {
        await page.goto('/plan/sar/user/aois', { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        await page.locator('.card', { hasText: name }).locator('button', { hasText: '검색에 적용' }).click();
        await page.waitForTimeout(2200);
    }

    await clickApply('경주 시내');
    const hashGyeongju = await captureCanvasHash();
    await clickApply('김해 산사태');
    const hashGimhae = await captureCanvasHash();
    await clickApply('포항 해안');
    const hashPohang = await captureCanvasHash();

    expect(hashGyeongju).not.toEqual('');
    expect(hashGyeongju).not.toEqual(hashGimhae);
    expect(hashGyeongju).not.toEqual(hashPohang);
    expect(hashGimhae).not.toEqual(hashPohang);
});

test('InSAR — 서로 다른 AOI 는 서로 다른 줌인 결과', async ({ page }) => {
    async function captureCanvasHash() {
        return await page.evaluate(() => {
            const canvas = document.querySelector('.ol-viewport canvas') as HTMLCanvasElement | null;
            if (!canvas) return '';
            const ctx = canvas.getContext('2d');
            if (!ctx) return '';
            const x = Math.floor(canvas.width * 0.6);
            const y = Math.floor(canvas.height * 0.2);
            const w = Math.floor(canvas.width * 0.3);
            const h = Math.floor(canvas.height * 0.3);
            try {
                const data = ctx.getImageData(x, y, w, h).data;
                let hash = 0;
                for (let i = 0; i < data.length; i += 64) hash = (hash * 31 + data[i]!) | 0;
                return String(hash);
            } catch {
                return '';
            }
        });
    }
    async function clickApplyInsar(name: string) {
        await page.goto('/plan/sar/user/aois', { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        await page.locator('.card', { hasText: name }).locator('button', { hasText: 'InSAR 에 적용' }).click();
        await page.waitForTimeout(2200);
    }

    await clickApplyInsar('경주 시내');
    const a = await captureCanvasHash();
    await clickApplyInsar('김해 산사태');
    const b = await captureCanvasHash();
    expect(a).not.toEqual('');
    expect(a).not.toEqual(b);
});
