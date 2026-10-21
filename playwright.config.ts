import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  reporter: [['list']], timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:3127', trace: 'retain-on-failure',
    launchOptions: process.env['CHROMIUM_EXECUTABLE_PATH'] ? {
      executablePath: process.env['CHROMIUM_EXECUTABLE_PATH'],
      args: process.env['CHROMIUM_ARGS'] ? JSON.parse(process.env['CHROMIUM_ARGS']) as string[] : [],
    } : {},
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
  webServer: {
    command: 'node dist/server/index.js', url: 'http://127.0.0.1:3127/health', reuseExistingServer: false,
    env: { HOST: '127.0.0.1', PORT: '3127', DATABASE_PATH: join(tmpdir(), `ecomdev-e2e-${randomUUID()}.sqlite`), APP_TIME_ZONE: 'Asia/Tashkent' },
  },
});
