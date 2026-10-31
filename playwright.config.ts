import { defineConfig, devices } from '@playwright/test';

const PORT = 3200;

/**
 * E2E against a production build on a throwaway PGlite database.
 * `npm run build` first; the web server wipes .data/e2e on each run.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `node -e "require('fs').rmSync('.data/e2e',{recursive:true,force:true})" && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/robots.txt`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // Never touch the real database: Next would otherwise load DATABASE_URL
      // from .env.local. An explicitly set (empty) variable is not overridden.
      DATABASE_URL: '',
      ALLOW_PGLITE_IN_PRODUCTION: '1',
      PGLITE_DATA_DIR: '.data/e2e',
      GAMEHUB_BOOTSTRAP_ADMINS: 'admin-e2e@example.com,starkmeet@gmail.com',
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
    },
  },
});
