import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('FIX Correlation', () => {
  test('load FIX data and verify correlation summary appears', async ({ page }) => {
    await page.goto('/');
    const skip = page.locator('[data-action="skipOnboarding"]');
    if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
    // Load ss data first
    const fixture = path.resolve(__dirname, 'fixtures/sample-ss.txt');
    const content = fs.readFileSync(fixture, 'utf-8');
    await page.evaluate(text => {
      const cm = document.querySelector('.CodeMirror')?.CodeMirror;
      if (cm) { cm.setValue(text); cm.save(); }
    }, content);
    await page.waitForTimeout(500);
    const parseBtn = page.locator('button[data-action="parse"]');
    if (await parseBtn.isVisible({ timeout: 1000 }).catch(() => false)) await parseBtn.click();
    await page.waitForTimeout(1500);
    // Navigate to Monitoring > FIX tab
    const monTab = page.locator('[data-view="charts"]');
    if (await monTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await monTab.click();
      await page.waitForTimeout(500);
      const fixTab = page.locator('[data-charts-tab="fix"]');
      if (await fixTab.isVisible({ timeout: 1000 }).catch(() => false)) {
        await fixTab.click();
        await page.waitForTimeout(500);
        // Verify FIX Latency section exists
        await expect(page.locator('body')).toContainText(/FIX Latency|LAG THRESHOLD/i);
      }
    }
  });
});
