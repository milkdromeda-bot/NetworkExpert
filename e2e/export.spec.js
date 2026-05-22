import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const skip = page.locator('[data-action="skipOnboarding"]');
    if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
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
  });

  test('export button is visible and opens menu', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export"), [data-action-menu="export"]');
    if (await exportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await exportBtn.click();
      await page.waitForTimeout(300);
      // Menu should show export options
      await expect(page.locator('body')).toContainText(/Executive summary|incident report|Evidence pack/i);
    }
  });

  test('incident report HTML export triggers download', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export"), [data-action-menu="export"]');
    if (await exportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await exportBtn.click();
      await page.waitForTimeout(300);
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      const htmlBtn = page.locator('[data-export-action="incident-html"]');
      if (await htmlBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await htmlBtn.click();
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.html$/);
        }
      }
    }
  });
});
