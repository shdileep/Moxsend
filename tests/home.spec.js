import { Eyes, Target } from '@applitools/eyes-playwright';
import { test } from '@playwright/test';

test('Moxsend Full UI Test', async ({ page }) => {

  const eyes = new Eyes();

  // Optional but recommended
  eyes.setBatch({
    name: 'Moxsend Batch Tests'
  });

  await eyes.open(
    page,
    'Moxsend App',
    'Homepage Visual Test'
  );

  // Open app
  await page.goto('https://moxsend.netlify.app/', {
    waitUntil: 'networkidle'
  });

  // Extra wait for animations/loading
  await page.waitForTimeout(2000);

  // Local screenshot
  await page.screenshot({
    path: 'homepage.png',
    fullPage: true
  });

  // Visual validation
  await eyes.check(
    'Homepage UI',
    Target.window().fully()
  );

  // Close Applitools session
  await eyes.close(false);

});