import { chromium, Page, Browser } from 'playwright';
import path from 'path';
import fs from 'fs';

export class PlaywrightService {
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (this.browser) {
      console.log('[PlaywrightService] Closing existing browser instance before creating a new one...');
      await this.browser.close();
      this.browser = null;
    }
    console.log('[PlaywrightService] Launching new browser instance');

    // Read SSL certificates
    const certPath = path.join(__dirname, '../../../certificates/localhost.pem');
    const keyPath = path.join(__dirname, '../../../certificates/localhost-key.pem');
    
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--ignore-certificate-errors',
        '--allow-insecure-localhost',
        `--use-gl=swiftshader`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    return this.browser;
  }

  async createPage(): Promise<Page | null> {
    try {
      const browser = await this.getBrowser();
      console.log('[PlaywrightService] Creating new browser context');
      
      const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        bypassCSP: true,
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        acceptDownloads: true,
        javaScriptEnabled: true,
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive'
        }
      });

      // Enable request interception
      await context.route('**/*', async (route) => {
        const request = route.request();
        try {
          // Log the request for debugging
          console.log(`[PlaywrightService] Intercepted request: ${request.url()}`);
          await route.continue();
        } catch (error) {
          console.error(`[PlaywrightService] Error handling request: ${error}`);
          await route.abort();
        }
      });

      console.log('[PlaywrightService] Creating new page');
      const page = await context.newPage();
      
      // Add error handling for page errors
      page.on('pageerror', error => {
        console.error('[PlaywrightService] Page error:', error);
      });

      page.on('console', msg => {
        console.log(`[Page Console] ${msg.type()}: ${msg.text()}`);
      });

      return page;
    } catch (error) {
      console.error('[PlaywrightService] Error creating page:', error);
      return null;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      console.log('[PlaywrightService] closeBrowser called (may be redundant if getBrowser always makes new)');
      await this.browser.close();
      this.browser = null;
    }
  }
} 