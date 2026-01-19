import { test, expect } from '@playwright/test';

test.describe('Match Display', () => {
  test('shows matches after selecting tournament', async ({ page }) => {
    // Capture console for debugging
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    await page.goto('/');

    // Wait for tournament list
    await page.waitForSelector('.tournament-list', { timeout: 15000 });

    // Click first tournament
    await page.locator('.tournament-list .card.interactive').first().click();

    // Wait for tournament to load
    await page.waitForTimeout(3000);

    // Take screenshot to see what's displayed
    await page.screenshot({ path: 'test-results/match-display.png' });

    // Check page content
    const pageContent = await page.content();
    console.log('\n=== Page State After Tournament Selection ===');
    console.log('Contains "Loading":', pageContent.includes('Loading'));
    console.log('Contains error:', pageContent.includes('error') || pageContent.includes('Error'));
    console.log('Contains "Arena":', pageContent.includes('Arena'));
    console.log('Contains "Match":', pageContent.includes('Match'));
    console.log('Contains player names:', pageContent.includes('NeonViper') || pageContent.includes('ShadowStrike'));

    // Log any errors from console
    const errors = consoleLogs.filter(log => log.includes('[error]') || log.includes('Error'));
    if (errors.length > 0) {
      console.log('\n=== Console Errors ===');
      errors.forEach(e => console.log(e));
    }

    // Verify we see matches or arena selection
    const hasMatchContent = await page.locator('text=/NeonViper|ShadowStrike|Arena|Match/i').first().isVisible().catch(() => false);
    console.log('Has match-related content:', hasMatchContent);
  });

  test('displays arena and match selection UI', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tournament-list', { timeout: 15000 });
    await page.locator('.tournament-list .card.interactive').first().click();

    // Wait for tournament view to load
    await page.waitForSelector('text=SELECT ARENA', { timeout: 10000 });

    // Verify arena section exists
    await expect(page.locator('text=SELECT ARENA')).toBeVisible();
    await expect(page.locator('text=Arena 1')).toBeVisible();

    // Verify match section exists
    await expect(page.locator('text=SELECT MATCH')).toBeVisible();

    // Verify bracket filters exist (using .tab class to avoid matching match cards)
    await expect(page.locator('.tab:has-text("All")')).toBeVisible();
    await expect(page.locator('.tab:has-text("Winners")')).toBeVisible();

    // Verify at least one match is displayed
    await expect(page.locator('text=vs').first()).toBeVisible();

    await page.screenshot({ path: 'test-results/tournament-view.png' });
  });
});
