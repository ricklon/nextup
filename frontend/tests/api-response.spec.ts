import { test, expect } from '@playwright/test';

test('capture True Finals API response structure', async ({ page }) => {
  let apiResponse: any = null;

  // Intercept the API response
  await page.route('**/truefinals.com/**', async route => {
    const response = await route.fetch();
    const json = await response.json();
    apiResponse = json;
    console.log('\n=== True Finals API Response ===');
    console.log(JSON.stringify(json, null, 2));
    await route.fulfill({ response, json });
  });

  await page.goto('/');
  await page.waitForTimeout(5000);

  if (apiResponse) {
    console.log('\n=== Response Structure Analysis ===');
    console.log('Type:', typeof apiResponse);
    console.log('Is Array:', Array.isArray(apiResponse));
    console.log('Keys:', Object.keys(apiResponse));

    if (apiResponse.tournaments) {
      console.log('tournaments array length:', apiResponse.tournaments.length);
      if (apiResponse.tournaments[0]) {
        console.log('First tournament keys:', Object.keys(apiResponse.tournaments[0]));
        console.log('First tournament:', JSON.stringify(apiResponse.tournaments[0], null, 2));
      }
    } else if (Array.isArray(apiResponse)) {
      console.log('Response is array, length:', apiResponse.length);
      if (apiResponse[0]) {
        console.log('First item keys:', Object.keys(apiResponse[0]));
        console.log('First item:', JSON.stringify(apiResponse[0], null, 2));
      }
    }
  }
});
