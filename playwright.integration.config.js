import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir: 'tests',
  testMatch: '*.integration.js',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3002',
    headless: true,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
      args: ['--no-sandbox'],
    },
  },
  webServer: [
    {
      command: 'node scripts/test-supabase-server.mjs',
      url: 'http://127.0.0.1:54329/health',
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'npm run dev -- --port 3002',
      env: {
        VITE_ENABLE_DEMO: 'false',
        VITE_SUPABASE_URL: 'http://127.0.0.1:54329',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_testing',
      },
      url: 'http://127.0.0.1:3002',
      reuseExistingServer: false,
    },
  ],
  reporter: 'list',
});
