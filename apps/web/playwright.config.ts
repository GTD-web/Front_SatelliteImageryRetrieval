import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3333';

/**
 * Playwright 설정 — Docker 로 띄운 web 컨테이너(`http://localhost:3333`)에 붙어
 * 주요 화면이 정상 렌더링 되는지를 점검한다.
 *
 * 컨테이너가 떠 있어야 한다:
 *   pnpm web:docker:up
 *
 * 그 다음:
 *   pnpm --filter @sentinel/web test:e2e:install   # 최초 1회
 *   pnpm --filter @sentinel/web test:e2e
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: { timeout: 5_000 },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        viewport: { width: 1440, height: 900 },
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
