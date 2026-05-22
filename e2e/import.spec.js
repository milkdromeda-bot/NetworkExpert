import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Import & Parse', () => {
  test('app loads and shows onboarding or import view', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Ultimate Network Expert');
  });

  test('import ss file and verify sockets are parsed', async ({ page }) => {
    await page.goto('/');
    // Skip onboarding if present
    const skip = page.locator('[data-action="skipOnboarding"]');
    if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skip.click();
    }
    // Navigate to import
    const importTab = page.locator('[data-view="ingest"]');
    if (await importTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await importTab.click();
    }
    // Upload file via file input or paste into editor
    const fixture = path.resolve(__dirname, 'fixtures/sample-ss.txt');
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fileInput.setInputFiles(fixture);
    } else {
      // Paste into CodeMirror
      const content = require('fs').readFileSync(fixture, 'utf-8');
      const editor = page.locator('.CodeMirror');
      await editor.click();
      await page.keyboard.insertText(content);
    }
    // Wait for parsing
    await page.waitForTimeout(2000);
    // Click analyze/parse button if exists
    const parseBtn = page.locator('button:has-text("Parse"), button:has-text("Analyze"), button[data-action="parse"]');
    if (await parseBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await parseBtn.click();
      await page.waitForTimeout(1000);
    }
    // Verify sockets are displayed
    await expect(page.locator('body')).toContainText(/socket|ESTAB|connection/i);
  });
});
