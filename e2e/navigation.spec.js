import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Navigation & Charts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Skip onboarding
    const skip = page.locator('[data-action="skipOnboarding"]');
    if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
    // Load data via paste
    const fixture = path.resolve(__dirname, 'fixtures/sample-ss.txt');
    const content = fs.readFileSync(fixture, 'utf-8');
    await page.evaluate(text => {
      const cm = document.querySelector('.CodeMirror')?.CodeMirror;
      if (cm) { cm.setValue(text); cm.save(); }
    }, content);
    await page.waitForTimeout(500);
    // Trigger parse
    const parseBtn = page.locator('button[data-action="parse"]');
    if (await parseBtn.isVisible({ timeout: 1000 }).catch(() => false)) await parseBtn.click();
    await page.waitForTimeout(1500);
  });

  test('navigate to Analysis tab', async ({ page }) => {
    const tab = page.locator('[data-view="analysis"]');
    if (await tab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tab.click();
      await expect(page.locator('body')).toContainText(/diagnosis|advisor|anomal/i);
    }
  });

  test('navigate to Monitoring and verify charts exist', async ({ page }) => {
    const tab = page.locator('[data-view="charts"]');
    if (await tab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(1000);
      // Charts should render as SVG elements
      const svgs = page.locator('svg.chart, svg[data-mini-chart], [data-chart-card]');
      const count = await svgs.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('theme toggle works', async ({ page }) => {
    const btn = page.locator('[data-action="toggleTheme"]');
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click();
      const theme = await page.locator('html').getAttribute('data-theme');
      expect(theme).toBe('light');
      await btn.click();
      const theme2 = await page.locator('html').getAttribute('data-theme');
      expect(['dark', null]).toContain(theme2);
    }
  });
});
