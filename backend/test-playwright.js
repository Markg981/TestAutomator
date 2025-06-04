 const { chromium } = require('playwright');

    (async () => {
      let browser;
      try {
        console.log('Launching browser...');
        browser = await chromium.launch({
          headless: true, // You can set this to false to see the browser window
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--ignore-certificate-errors',
            '--allow-insecure-localhost',
          ],
        });
        const context = await browser.newContext({
          ignoreHTTPSErrors: true,
          bypassCSP: true,
        });
        console.log('Creating new page...');
        const page = await context.newPage();
        const targetUrl = 'https://localhost:62701/gstd/gstd-report'; // Your target URL
        console.log(`Navigating to ${targetUrl}...`);
        const response = await page.goto(targetUrl, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        if (response) {
          console.log(`Navigation response status: ${response.status()}`);
          console.log(`Final URL: ${page.url()}`); // Important: What URL does Playwright end up on?
          const title = await page.title();
          console.log(`Page title: ${title}`);     // Important: What is the title of the page loaded?
          const content = await page.content();
          console.log(`Content length: ${content.length}`);
          // For detailed inspection, you can save the content to a file:
          // const fs = require('fs');
          // fs.writeFileSync('page_content.html', content);
          // console.log('Content saved to page_content.html');
        } else {
          console.log('Navigation returned null response.');
        }
      } catch (error) {
        console.error('Error during Playwright test:', error);
      } finally {
        if (browser) {
          console.log('Closing browser...');
          await browser.close();
        }
      }
    })();