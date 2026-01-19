import { test, expect } from '@playwright/test';

test('capture True Finals tournament detail API response', async ({ page }) => {
  let tournamentListResponse: any = null;
  let tournamentDetailResponse: any = null;

  // Intercept API responses
  await page.route('**/truefinals.com/**', async route => {
    const url = route.request().url();
    const response = await route.fetch();
    const json = await response.json();

    if (url.includes('/user/tournaments')) {
      tournamentListResponse = json;
      console.log('\n=== Tournament List Response ===');
      console.log(JSON.stringify(json, null, 2));
    } else if (url.includes('/tournaments/')) {
      tournamentDetailResponse = json;
      console.log('\n=== Tournament Detail Response ===');
      console.log('Response type:', typeof json);
      console.log('Top-level keys:', Object.keys(json));

      // Log structure of each key
      for (const key of Object.keys(json)) {
        const value = json[key];
        if (Array.isArray(value)) {
          console.log(`\n${key}: Array with ${value.length} items`);
          if (value[0]) {
            console.log(`  First item keys:`, Object.keys(value[0]));
            console.log(`  First item:`, JSON.stringify(value[0], null, 2).slice(0, 500));
          }
        } else if (typeof value === 'object' && value !== null) {
          console.log(`\n${key}: Object with keys:`, Object.keys(value));
        } else {
          console.log(`\n${key}:`, value);
        }
      }

      // Full response (truncated if too long)
      const fullJson = JSON.stringify(json, null, 2);
      console.log('\n=== Full Response (first 5000 chars) ===');
      console.log(fullJson.slice(0, 5000));
    }

    await route.fulfill({ response, json });
  });

  await page.goto('/');

  // Wait for tournament list to load
  await page.waitForSelector('.tournament-list', { timeout: 10000 });

  // Click on first tournament to trigger detail fetch
  const tournamentCard = page.locator('.tournament-list .card.interactive').first();
  console.log('Found tournament cards:', await page.locator('.tournament-list .card').count());

  if (await tournamentCard.isVisible()) {
    console.log('Clicking on tournament card...');
    await tournamentCard.click();

    // Wait for detail request to complete
    await page.waitForTimeout(5000);
  } else {
    console.log('Tournament card not visible, trying text-based selector');
    await page.click('text=GSCRL Test Tournament');
    await page.waitForTimeout(5000);
  }

  // Clean up routes
  await page.unrouteAll({ behavior: 'ignoreErrors' });

  console.log('\n=== Summary ===');
  console.log('List response received:', !!tournamentListResponse);
  console.log('Detail response received:', !!tournamentDetailResponse);
});
