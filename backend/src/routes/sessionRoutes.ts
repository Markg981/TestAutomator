import { Router } from 'express';
import { PlaywrightService } from '../services/PlaywrightService';

const router = Router();
const playwrightService = new PlaywrightService();

router.post('/load', async (req, res) => {
  const { url } = req.body;
  console.log(`[Backend] Received request to load URL: ${url}`);

  if (!url) {
    console.error('[Backend] URL is required');
    return res.status(400).json({ error: 'URL is required' });
  }

  let page = null;
  try {
    page = await playwrightService.createPage();
    if (!page) {
      throw new Error('Failed to create browser page');
    }

    console.log(`[Backend] Navigating to URL: ${url}`);
    
    // Add event listeners before navigation
    page.on('request', request => {
      console.log(`[Page Request] ${request.method()} ${request.url()}`);
      console.log(`[Page Request Headers] ${JSON.stringify(request.headers())}`);
    });

    page.on('response', response => {
      console.log(`[Page Response] ${response.status()} ${response.url()}`);
    });

    page.on('console', msg => {
      console.log(`[Page Console] ${msg.type()}: ${msg.text()}`);
    });

    // Set extra HTTP headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive'
    });

    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Enhanced logging for page.goto() response
    if (response) {
      console.log(`[Backend] page.goto response status: ${response.status()}`);
      console.log(`[Backend] page.goto response URL: ${response.url()}`);
      console.log(`[Backend] page.goto response headers: ${JSON.stringify(response.headers())}`);
    } else {
      console.log('[Backend] page.goto returned a null response object.');
    }

    if (!response) {
      throw new Error('Navigation returned null response');
    }

    if (!response.ok()) {
      throw new Error(`Navigation failed with status ${response.status()}`);
    }

    console.log(`[Backend] Successfully loaded URL: ${url}`);
    console.log(`[Backend] Final URL after navigation: ${page.url()}`);

    // Wait for network to be idle and page to be fully loaded
    await Promise.all([
      page.waitForLoadState('networkidle'),
      page.waitForLoadState('domcontentloaded'),
      page.waitForLoadState('load')
    ]);
    
    // Get page content
    const content = await page.content();
    console.log(`[Backend] Page title: ${await page.title()}`);
    console.log(`[Backend] Content length: ${content.length}`);
    console.log(`[Backend] Content snippet: ${content.substring(0, 500)}`);

    // Take screenshot
    const screenshot = await page.screenshot({ 
      type: 'jpeg',
      quality: 80,
      fullPage: true
    });

    res.json({
      content,
      screenshot: screenshot.toString('base64'),
      title: await page.title()
    });

  } catch (error) {
    console.error('[Backend] Error loading page:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    if (page) {
      console.log('[Backend] Closing browser page');
      await page.close().catch(console.error);
    }
  }
});

export default router; 