// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = 4321;

module.exports = defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  // tests/serve.js mirrors production: same CSP and headers, same deployed paths
  webServer: {
    command: 'node tests/serve.js',
    url: `http://127.0.0.1:${PORT}/`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
