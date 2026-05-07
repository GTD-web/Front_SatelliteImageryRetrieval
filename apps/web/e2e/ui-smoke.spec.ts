import { expect, test } from '@playwright/test';

/**
 * 주요 화면이 콘솔 에러 없이 렌더되는지를 빠르게 훑는 smoke test.
 * Docker 로 띄운 web 컨테이너(`http://localhost:3333`)에 붙어 동작한다.
 */

const PAGES: Array<{ name: string; path: string; expect?: RegExp | string }> = [
    { name: '검색', path: '/plan/sar/user/search', expect: /검색/ },
    { name: '다운로드', path: '/plan/sar/user/downloads', expect: /SLC|다운로드/ },
    { name: 'InSAR', path: '/plan/sar/user/insar', expect: /분석 요청|InSAR/ },
    { name: 'AOI 관리', path: '/plan/sar/user/aois', expect: /AOI/ },
    { name: '장바구니', path: '/plan/sar/user/cart', expect: /장바구니|선택됨|검색으로/ },
    { name: '관리자 대시보드', path: '/plan/sar/admin/dashboard' },
    { name: '관리자 승인 큐', path: '/plan/sar/admin/approvals' },
    { name: '관리자 사용자', path: '/plan/sar/admin/users' },
    { name: '관리자 감사 로그', path: '/plan/sar/admin/audit-logs' },
    { name: '관리자 크롤 AOI', path: '/plan/sar/admin/crawl-targets' },
    { name: '관리자 Sync', path: '/plan/sar/admin/sync-monitor' },
];

for (const p of PAGES) {
    test(`${p.name} 페이지가 콘솔 에러 없이 렌더된다`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
        });

        await page.goto(p.path, { waitUntil: 'networkidle' });
        // 모든 페이지에서 사이드바가 보여야 한다 (페이지 헤더 제거 후 가장 안정적인 앵커)
        await expect(page.getByTestId('sidenav-avatar')).toBeVisible();
        if (p.expect) {
            await expect(page.locator('body')).toContainText(p.expect);
        }

        // 알려진 노이즈는 무시 (개발 모드 hot-reload 경고 등)
        const significant = errors.filter(
            (e) =>
                !/Hydration|hydrating|HMR|DevTools|Download the React DevTools|favicon/i.test(e),
        );
        expect(significant, significant.join('\n')).toEqual([]);
    });
}

test('아바타 클릭 시 사용자 메뉴 + 역할 전환이 보인다', async ({ page }) => {
    await page.goto('/plan/sar/user/search', { waitUntil: 'networkidle' });

    const avatar = page.getByTestId('sidenav-avatar');
    await expect(avatar).toBeVisible();

    // 메뉴는 처음엔 닫혀 있다
    await expect(page.getByTestId('sidenav-avatar-menu')).toHaveCount(0);

    await avatar.click();

    const menu = page.getByTestId('sidenav-avatar-menu');
    await expect(menu).toBeVisible();
    // 사용자 정보 + 역할 라벨 + 두 옵션이 모두 보여야 한다
    await expect(menu).toContainText('김연구원');
    await expect(menu).toContainText('역할');
    const userBtn = menu.getByRole('radio', { name: 'User' });
    const adminBtn = menu.getByRole('radio', { name: 'Admin' });
    await expect(userBtn).toBeVisible();
    await expect(adminBtn).toBeVisible();
    await expect(userBtn).toHaveAttribute('aria-checked', 'true');

    // 메뉴가 화면 안에 있어야 한다 (off-screen 회귀 방지)
    const box = await menu.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
        const viewport = page.viewportSize()!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }

    // Admin 으로 전환 → URL 이 admin 으로 이동
    await adminBtn.click();
    await page.waitForURL(/\/plan\/sar\/admin\//);
    expect(page.url()).toContain('/plan/sar/admin/');
});

test('Esc 키로 사용자 메뉴가 닫힌다', async ({ page }) => {
    await page.goto('/plan/sar/user/search', { waitUntil: 'networkidle' });
    await page.getByTestId('sidenav-avatar').click();
    await expect(page.getByTestId('sidenav-avatar-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('sidenav-avatar-menu')).toHaveCount(0);
});

test('다운로드 페이지 — 실시간 뱃지/새로고침이 칩 필터와 같은 행에 있다', async ({ page }) => {
    await page.goto('/plan/sar/user/downloads', { waitUntil: 'networkidle' });
    const toolbar = page.locator('.toolbar').first();
    await expect(toolbar).toBeVisible();
    await expect(toolbar).toContainText('실시간');
    await expect(toolbar.locator('button[aria-label="새로고침"]')).toBeVisible();
});

test('InSAR — DInSAR 파라미터 옆에 info 아이콘이 더 이상 없다', async ({ page }) => {
    await page.goto('/plan/sar/user/insar', { waitUntil: 'networkidle' });
    const heading = page.getByText('DInSAR 파라미터', { exact: true });
    await expect(heading).toBeVisible();
    // 같은 row 안에 info 아이콘이 없는지 확인 (section 헤더 옆)
    const headingRow = heading.locator('xpath=..');
    const infoIcons = headingRow.locator('[role="button"][aria-expanded]');
    await expect(infoIcons).toHaveCount(0);
});

test('InSAR — 파라미터 info 아이콘 클릭 시 툴팁이 표시되고 외부 클릭으로 닫힌다', async ({ page }) => {
    await page.goto('/plan/sar/user/insar', { waitUntil: 'networkidle' });
    // 첫 NumberField 의 info 아이콘 (최소 코히어런스 옆)
    const tip = page.getByRole('button', { name: /픽셀별 위상 신뢰도/ });
    await expect(tip).toBeVisible();
    await tip.click();
    const tooltip = page.getByRole('tooltip').filter({ hasText: '픽셀별 위상 신뢰도' });
    await expect(tooltip).toBeVisible();
    // 외부 클릭으로 닫힘
    await page.mouse.click(10, 10);
    await expect(tooltip).toHaveCount(0);
});
