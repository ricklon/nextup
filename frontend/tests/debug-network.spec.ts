import { test, expect } from '@playwright/test';

test.describe('Network Debug', () => {
  test('capture API calls and console output', async ({ page }) => {
    const consoleLogs: string[] = [];
    const networkRequests: { url: string; status?: number; error?: string }[] = [];

    // Capture console logs
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Capture page errors
    page.on('pageerror', error => {
      consoleLogs.push(`[PAGE ERROR] ${error.message}`);
    });

    // Capture network requests
    page.on('request', request => {
      networkRequests.push({ url: request.url() });
    });

    page.on('response', response => {
      const req = networkRequests.find(r => r.url === response.url() && !r.status);
      if (req) {
        req.status = response.status();
      }
    });

    page.on('requestfailed', request => {
      const req = networkRequests.find(r => r.url === request.url() && !r.error);
      if (req) {
        req.error = request.failure()?.errorText || 'Unknown error';
      }
    });

    await page.goto('/');

    // Wait for app to load and potentially make API calls
    await page.waitForTimeout(10000);

    // Output results
    console.log('\n=== Console Logs ===');
    consoleLogs.forEach(log => console.log(log));

    console.log('\n=== Network Requests ===');
    networkRequests
      .filter(r => r.url.includes('truefinals') || r.url.includes('localhost:8787'))
      .forEach(r => {
        console.log(`${r.url} -> Status: ${r.status || 'pending'}, Error: ${r.error || 'none'}`);
      });

    // Take final screenshot
    await page.screenshot({ path: 'test-results/network-debug.png' });

    // Check for specific API calls
    const trueFinalsCall = networkRequests.find(r => r.url.includes('truefinals.com'));
    const workerCall = networkRequests.find(r => r.url.includes('localhost:8787'));

    console.log('\n=== API Summary ===');
    console.log('True Finals API called:', !!trueFinalsCall);
    if (trueFinalsCall) {
      console.log('  URL:', trueFinalsCall.url);
      console.log('  Status:', trueFinalsCall.status);
      console.log('  Error:', trueFinalsCall.error);
    }

    console.log('Worker API called:', !!workerCall);
    if (workerCall) {
      console.log('  URL:', workerCall.url);
      console.log('  Status:', workerCall.status);
      console.log('  Error:', workerCall.error);
    }

    // Check what view we're on
    const pageContent = await page.content();
    console.log('\n=== Page State ===');
    console.log('Contains "Configuration":', pageContent.includes('Configuration'));
    console.log('Contains "Select Tournament":', pageContent.includes('Select Tournament'));
    console.log('Contains "Loading":', pageContent.includes('Loading'));
    console.log('Contains error class:', pageContent.includes('class="error"') || pageContent.includes('ErrorAlert'));
  });

  test('check if loadTournaments is called', async ({ page }) => {
    // Inject console.log to track function calls
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        console.log('[FETCH]', args[0]);
        return originalFetch.apply(this, args);
      };
    });

    const fetchCalls: string[] = [];
    page.on('console', msg => {
      if (msg.text().startsWith('[FETCH]')) {
        fetchCalls.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(8000);

    console.log('\n=== Fetch Calls ===');
    fetchCalls.forEach(call => console.log(call));

    // Check if tournaments API was called
    const tournamentsCall = fetchCalls.find(c => c.includes('tournaments'));
    console.log('\nTournaments API called:', !!tournamentsCall);
  });
});
