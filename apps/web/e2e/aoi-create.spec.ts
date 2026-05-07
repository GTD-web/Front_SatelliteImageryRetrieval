import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1600, height: 1000 } });

test('새 AOI 등록 모달에 지도 + 사각형 작도 안내가 보인다', async ({ page }) => {
    page.on('pageerror', (e) => console.log('pageerror:', e.message));
    page.on('console', (msg) => {
        if (msg.type() === 'error') console.log('[console.error]', msg.text());
    });

    await page.goto('/plan/sar/user/aois', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: '새 AOI 등록' }).first().click();

    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();
    // OL 지도 캔버스
    await expect(modal.locator('.ol-viewport canvas').first()).toBeVisible();
    // 사각형 도구 활성 시 안내 배너
    await expect(modal.getByText(/사각형 AOI 를 그리세요/)).toBeVisible();
    // 좌표 입력란 4개 (NW lat/lon, SE lat/lon)
    await expect(modal.locator('input[placeholder="위도 (°N)"]')).toHaveCount(2);
    await expect(modal.locator('input[placeholder="경도 (°E)"]')).toHaveCount(2);

    await page.screenshot({ path: 'aoi-create-modal.png' });
});

test('좌표 직접 입력 → 지도에 사각형 표시 → 등록', async ({ page }) => {
    await page.goto('/plan/sar/user/aois', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: '새 AOI 등록' }).first().click();
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();

    // 사각형 도구를 끄고 좌표 직접 입력
    await modal.locator('input[placeholder="위도 (°N)"]').nth(0).fill('36.20');
    await modal.locator('input[placeholder="경도 (°E)"]').nth(0).fill('129.20');
    await modal.locator('input[placeholder="위도 (°N)"]').nth(1).fill('36.00');
    await modal.locator('input[placeholder="경도 (°E)"]').nth(1).fill('129.50');

    await modal.locator('input[placeholder*="부산"]').fill('e2e 테스트 AOI');
    await modal.getByRole('button', { name: '등록' }).click();

    await expect(modal).toBeHidden();
    await expect(page.locator('.card', { hasText: 'e2e 테스트 AOI' })).toBeVisible();
});

test('좌표 미입력 시 등록 시 검증 에러 토스트', async ({ page }) => {
    await page.goto('/plan/sar/user/aois', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: '새 AOI 등록' }).first().click();
    const modal = page.locator('.modal');
    await modal.locator('input[placeholder*="부산"]').fill('이름만 입력');
    await modal.getByRole('button', { name: '등록' }).click();
    await expect(page.getByText(/지도에서 사각형을 그리거나 NW\/SE 좌표를 입력/)).toBeVisible();
});
