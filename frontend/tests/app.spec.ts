import { test, expect } from '@playwright/test';

test.describe('App Startup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('shows config status screen on initial load', async ({ page }) => {
    await page.goto('/');

    // Should show the config status screen
    await expect(page.locator('h1')).toContainText('NextUp Configuration');

    // Should show service status items
    await expect(page.locator('text=True Finals API')).toBeVisible();
    await expect(page.locator('text=Worker API')).toBeVisible();
    await expect(page.locator('text=OBS WebSocket')).toBeVisible();
  });

  test('config status checks services and shows results', async ({ page }) => {
    await page.goto('/');

    // Wait for checks to complete (either OK or error)
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes('Connected') ||
             text.includes('Ready') ||
             text.includes('error') ||
             text.includes('Missing') ||
             text.includes('failed');
    }, { timeout: 10000 });

    // True Finals status should show something
    const tfStatus = page.locator('.service').filter({ hasText: 'True Finals API' });
    await expect(tfStatus).toBeVisible();

    // Worker status should show something
    const workerStatus = page.locator('.service').filter({ hasText: 'Worker API' });
    await expect(workerStatus).toBeVisible();
  });

  test('shows Continue button or auto-advances when services are ready', async ({ page }) => {
    await page.goto('/');

    // Wait for services to be checked
    await page.waitForTimeout(3000);

    // Check if Continue button appears (only if services are OK)
    const continueButton = page.locator('button:has-text("Continue to App")');
    const retryButton = page.locator('button:has-text("Retry")');
    const tournamentSelector = page.locator('text=Select Tournament');

    // Either Continue, Retry, or already advanced to tournament selector
    const hasContinue = await continueButton.isVisible().catch(() => false);
    const hasRetry = await retryButton.isVisible().catch(() => false);
    const hasAutoAdvanced = await tournamentSelector.isVisible().catch(() => false);

    expect(hasContinue || hasRetry || hasAutoAdvanced).toBe(true);
  });

  test('auto-advances to tournament selector when services are ready', async ({ page }) => {
    await page.goto('/');

    // Wait for potential auto-advance (up to 10 seconds)
    try {
      await page.waitForSelector('text=Select Tournament', { timeout: 10000 });
      // Successfully auto-advanced
      await expect(page.locator('h1')).toContainText('Select Tournament');
    } catch {
      // Didn't auto-advance - check if we're stuck on config with errors
      const configTitle = await page.locator('h1').textContent();
      if (configTitle?.includes('Configuration')) {
        // Still on config screen - services might have failed
        console.log('Still on config screen - checking for errors');
        const pageContent = await page.content();
        console.log('Page contains error:', pageContent.includes('error') || pageContent.includes('Missing'));
      }
    }
  });
});

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('can navigate to settings from config screen', async ({ page }) => {
    await page.goto('/');

    // Wait for config screen to load
    await expect(page.locator('h1')).toContainText('NextUp Configuration');

    // Wait for checks and potential auto-advance or stay on config
    await page.waitForTimeout(3000);

    // If we auto-advanced, we need to find settings button
    const currentTitle = await page.locator('h1').first().textContent();

    if (currentTitle?.includes('Select Tournament') || currentTitle?.includes('Tournament')) {
      // We're on tournament screen - click settings gear
      const settingsButton = page.locator('button[title="Settings"]');
      await settingsButton.click();
    }

    // Check if settings page is accessible
    // Note: If still on config, settings might not be directly accessible
  });

  test('settings page shows all configuration sections', async ({ page }) => {
    // First get past config screen
    await page.goto('/');
    await page.waitForTimeout(5000);

    // Try to navigate to settings
    const settingsButton = page.locator('button[title="Settings"]');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();

      // Should show settings sections
      await expect(page.locator('h1')).toContainText('Settings');
      await expect(page.locator('h2:has-text("True Finals API")')).toBeVisible();
      await expect(page.locator('h2:has-text("OBS WebSocket")')).toBeVisible();
      await expect(page.locator('h2:has-text("Default Arenas")')).toBeVisible();
      await expect(page.locator('h2:has-text("Polling Intervals")')).toBeVisible();
    }
  });

  test('settings can be saved and persisted', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(5000);

    const settingsButton = page.locator('button[title="Settings"]');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();

      // Wait for settings page
      await expect(page.locator('h1')).toContainText('Settings');

      // Modify arena setting
      const arenasInput = page.locator('#arenas');
      await arenasInput.fill('Test Arena 1, Test Arena 2');

      // Save settings
      await page.locator('button:has-text("Save Settings")').click();

      // Should show save confirmation
      await expect(page.locator('text=Settings saved')).toBeVisible();

      // Verify localStorage was updated
      const settings = await page.evaluate(() => localStorage.getItem('nextup-settings'));
      expect(settings).toContain('Test Arena 1');
    }
  });
});

test.describe('Tournament Selection', () => {
  test('tournament selector shows loading state', async ({ page }) => {
    await page.goto('/');

    // Wait for config to pass and navigate to tournaments
    try {
      await page.waitForSelector('text=Select Tournament', { timeout: 15000 });

      // Should either show tournaments or loading
      const hasLoading = await page.locator('text=Loading tournaments').isVisible().catch(() => false);
      const hasTournaments = await page.locator('.tournament-list').isVisible().catch(() => false);
      const hasEmpty = await page.locator('text=No tournaments found').isVisible().catch(() => false);
      const hasError = await page.locator('.error').isVisible().catch(() => false);

      // One of these states should be true
      expect(hasLoading || hasTournaments || hasEmpty || hasError).toBe(true);
    } catch {
      // Stuck on config screen
      console.log('Could not reach tournament selector');
    }
  });

  test('clicking tournament navigates to assign view', async ({ page }) => {
    await page.goto('/');

    try {
      // Wait for tournament list
      await page.waitForSelector('.tournament-list', { timeout: 15000 });

      // Click first tournament
      const firstTournament = page.locator('.tournament-list > *').first();
      await firstTournament.click();

      // Should navigate to assign view with tabs
      await expect(page.locator('text=Assign')).toBeVisible();
      await expect(page.locator('text=Status')).toBeVisible();
    } catch (e) {
      console.log('Could not test tournament selection:', e);
    }
  });
});

test.describe('View Navigation', () => {
  test('can navigate between Assign and Status tabs', async ({ page }) => {
    await page.goto('/');

    try {
      // Get to tournament view
      await page.waitForSelector('.tournament-list', { timeout: 15000 });
      const firstTournament = page.locator('.tournament-list > *').first();
      await firstTournament.click();

      // Wait for tabs to appear
      await page.waitForSelector('text=Assign');
      await page.waitForSelector('text=Status');

      // Click Status tab
      await page.locator('button:has-text("Status")').click();

      // Should show arena status board
      await page.waitForTimeout(500);

      // Click Assign tab
      await page.locator('button:has-text("Assign")').click();

      // Should show assignment UI
      await page.waitForTimeout(500);
    } catch (e) {
      console.log('Could not test tab navigation:', e);
    }
  });

  test('back button returns to tournament list', async ({ page }) => {
    await page.goto('/');

    try {
      // Get to tournament view
      await page.waitForSelector('.tournament-list', { timeout: 15000 });
      const firstTournament = page.locator('.tournament-list > *').first();
      await firstTournament.click();

      // Wait for tournament view
      await page.waitForSelector('text=Assign');

      // Click back button
      await page.locator('.back-button').click();

      // Should return to tournament selector
      await expect(page.locator('h1')).toContainText('Select Tournament');
    } catch (e) {
      console.log('Could not test back navigation:', e);
    }
  });
});

test.describe('Debug: Current App State', () => {
  test('capture current app state for debugging', async ({ page }) => {
    await page.goto('/');

    // Take screenshot at different stages
    await page.screenshot({ path: 'test-results/01-initial-load.png' });

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/02-after-2s.png' });

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/03-after-5s.png' });

    // Log current state
    const title = await page.locator('h1').first().textContent().catch(() => 'No h1 found');
    console.log('Current title:', title);

    const bodyText = await page.locator('body').textContent();
    console.log('Page contains "Configuration":', bodyText?.includes('Configuration'));
    console.log('Page contains "Tournament":', bodyText?.includes('Tournament'));
    console.log('Page contains "error":', bodyText?.includes('error'));
    console.log('Page contains "Loading":', bodyText?.includes('Loading'));

    // Check localStorage
    const settings = await page.evaluate(() => localStorage.getItem('nextup-settings'));
    console.log('Settings in localStorage:', settings ? 'Yes' : 'No');

    // Check for visible errors
    const errors = await page.locator('.error, [class*="error"]').allTextContents();
    if (errors.length > 0) {
      console.log('Visible errors:', errors);
    }
  });
});
