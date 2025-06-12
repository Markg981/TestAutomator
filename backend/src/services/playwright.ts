import { Browser, chromium, Page } from 'playwright';

interface BrowserSession {
  browser: Browser;
  page: Page;
  lastActivity: number;
}

interface ElementInfo {
  tag: string;
  id?: string;
  classes?: string[];
  text?: string;
  attributes: Record<string, string>;
  xpath: string;
  selector: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  frameSelector?: string; // New field for iframe context
}

class PlaywrightService {
  private sessions: Map<string, BrowserSession> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Cleanup inactive sessions periodically
    setInterval(() => this.cleanupInactiveSessions(), 5 * 60 * 1000);
  }

  private async cleanupInactiveSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        console.log(`Closing inactive session: ${sessionId}`);
        await this.closeSession(sessionId);
      }
    }
  }

  async getOrCreatePageForUrl(url: string): Promise<{ sessionId: string, page: Page, browser: Browser, actualUrl: string, title: string, isNewSession: boolean }> {
    // Attempt to find an existing session for the URL (or base URL)
    for (const [sessionId, session] of this.sessions.entries()) {
      // A more sophisticated URL matching might be needed, e.g., comparing without query params or hash
      if (session.page.url().startsWith(url)) { // Simple check: startsWith
        console.log(`Reusing existing session ${sessionId} for URL: ${url}`);
        session.lastActivity = Date.now();
        return {
          sessionId,
          page: session.page,
          browser: session.browser,
          actualUrl: session.page.url(),
          title: await session.page.title(),
          isNewSession: false,
        };
      }
    }

    // If no suitable session found, create a new one
    console.log(`Creating new session for URL: ${url}`);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    let actualUrl = '';
    let title = '';

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      actualUrl = page.url();
      title = await page.title();
      
      const sessionId = Date.now().toString();
      this.sessions.set(sessionId, {
        browser,
        page,
        lastActivity: Date.now()
      });

      return {
        sessionId,
        page,
        browser,
        actualUrl,
        title,
        isNewSession: true,
      };
    } catch (error) {
      await browser.close(); // Ensure browser is closed on error during creation
      throw error;
    }
  }

  // createSession can be refactored or removed if getOrCreatePageForUrl covers all needs.
  // For now, let's keep it and make it use getOrCreatePageForUrl to ensure consistency.
  async createSession(url: string): Promise<{ sessionId: string; screenshot: string; title: string, actualUrl: string }> {
    const { sessionId, page, actualUrl, title, isNewSession } = await this.getOrCreatePageForUrl(url);

    // If it's a new session, a screenshot might be relevant.
    // If an existing session, the "screenshot" might be stale or less relevant.
    // This behavior can be adjusted based on requirements.
    let screenshot = "";
    if (isNewSession) {
        const screenshotBuffer = await page.screenshot({ fullPage: true });
        screenshot = screenshotBuffer.toString('base64');
    } else {
        console.log(`Session ${sessionId} for ${url} already existed. Screenshot not taken.`);
    }


    return {
      sessionId,
      screenshot, // This might be empty if the session was reused
      title,
      actualUrl
    };
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.browser.close();
      this.sessions.delete(sessionId);
    }
  }

  async scanElements(sessionId: string): Promise<ElementInfo[]> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.lastActivity = Date.now();

    const allElements: ElementInfo[] = [];

    // Helper function to scan a given frame
    const scanFrameAndItsChildren = async (currentFrame: import('playwright').Frame, frameSelectorPath: string) => {
        // The actual element scanning logic, to be run in the frame's context
        // Ensure ElementInfo here matches the one outside, or Omit the frameSelector for now.
        const elementsInFrame = await currentFrame.evaluate((currentFrameSelectorPath) => {
            function getXPath(element: Element): string {
              if (element.id) return `//*[@id="${element.id}"]`;
              const paths: string[] = [];
              let current = element;
              while (current.parentNode instanceof Element) {
                let index = 1;
                let sibling = current.previousElementSibling;
                while (sibling) {
                  if (sibling.nodeName === current.nodeName) index++;
                  sibling = sibling.previousElementSibling;
                }
                const tagName = current.nodeName.toLowerCase();
                paths.unshift(`${tagName}[${index}]`);
                current = current.parentNode;
              }
              return '/' + paths.join('/');
            }

            function getCssSelector(el: Element): string {
              if (!(el instanceof Element)) return '';
              const path: string[] = [];
              let currentEl: Element | null = el;
              while (currentEl instanceof Element) {
                  let selector = currentEl.nodeName.toLowerCase();
                  if (currentEl.id) {
                      selector = '#' + currentEl.id;
                      path.unshift(selector);
                      break;
                  } else {
                      const parent: HTMLElement | null = currentEl.parentElement;
                      if (parent) {
                          let count = 0;
                          let sibling: Element | null = parent.firstElementChild;
                          while (sibling) {
                              if (sibling.nodeName === currentEl.nodeName) {
                                  count++;
                                  if (sibling === currentEl) {
                                      selector += `:nth-of-type(${count})`;
                                      break;
                                  }
                              }
                              sibling = sibling.nextElementSibling;
                          }
                      }
                  }
                  path.unshift(selector);
                  currentEl = currentEl.parentElement;
              }
              return path.join(' > ');
            }

            const rawElements = document.querySelectorAll<HTMLElement>('input, button, a, select, textarea, [role="button"], [role="link"], [role="tab"], [data-testid], p, h1, h2, h3, h4, h5, h6, div[id], span[id]');
            console.log(`[Playwright Eval${currentFrameSelectorPath ? ` in ${currentFrameSelectorPath}` : ''}] Initial elements found by querySelectorAll:`, rawElements.length);

            const processedElements = Array.from(rawElements).map(el => {
                try {
                    const rect = el.getBoundingClientRect();
                    const attributes: Record<string, string> = {};
                    Array.from(el.attributes).forEach(attr => {
                        attributes[attr.name] = attr.value;
                    });

                    let xpath = '';
                    try {
                        xpath = getXPath(el);
                    } catch (e: any) {
                        console.warn(`[Playwright Eval${currentFrameSelectorPath ? ` in ${currentFrameSelectorPath}` : ''}] Error XPath:`, el.outerHTML, e.message);
                    }

                    let selector = '';
                    try {
                        selector = getCssSelector(el);
                    } catch (e: any) {
                        console.warn(`[Playwright Eval${currentFrameSelectorPath ? ` in ${currentFrameSelectorPath}` : ''}] Error CSS:`, el.outerHTML, e.message);
                    }

                    return { // This is Omit<ElementInfo, 'frameSelector' | 'classes'> effectively + classes
                        tag: el.tagName.toLowerCase(),
                        id: el.id || undefined,
                        classes: Array.from(el.classList),
                        text: el.textContent?.trim() || undefined,
                        attributes,
                        xpath,
                        selector,
                        boundingBox: {
                            x: rect.x,
                            y: rect.y,
                            width: rect.width,
                            height: rect.height
                        }
                    };
                } catch (error: any) {
                    console.warn(`[Playwright Eval${currentFrameSelectorPath ? ` in ${currentFrameSelectorPath}` : ''}] General error processing element:`, el ? el.outerHTML : 'Element undefined', error.message, error.stack);
                    return null;
                }
            });
            // Make sure the return type matches what's expected by `elementsInFrame`
            const finalElements = processedElements.filter(el => el !== null) as Array<Omit<ElementInfo, 'frameSelector'>>;
            console.log(`[Playwright Eval${currentFrameSelectorPath ? ` in ${currentFrameSelectorPath}` : ''}] Elements processed:`, finalElements.length);
            return finalElements;
        }, frameSelectorPath); // Pass frameSelectorPath to evaluate

        // Add frameSelector to elements found in this frame and add to global list
        elementsInFrame.forEach(el => {
            allElements.push({ ...el, frameSelector: frameSelectorPath || undefined });
        });

        // Recursively scan child frames
        for (const childFrame of currentFrame.childFrames()) {
            let childFrameSelectorSegment = `iframe[name='${childFrame.name()}']`; // Default
            try {
                const iframeElementHandle = await childFrame.frameElement();
                if (iframeElementHandle) {
                    const id = await iframeElementHandle.getAttribute('id');
                    if (id) {
                        childFrameSelectorSegment = `iframe#${id}`;
                    } else {
                        const nameAttr = await iframeElementHandle.getAttribute('name');
                        if (nameAttr) {
                             childFrameSelectorSegment = `iframe[name='${nameAttr}']`;
                        } else {
                            // Fallback: could use order, or a more complex XPath/CSS to identify the iframe
                            // For now, we'll rely on name() if no ID/name attribute.
                            console.warn(`[PlaywrightService] Iframe without ID or name attribute found. Using name from frame object: ${childFrame.name()}`);
                        }
                    }
                    await iframeElementHandle.dispose();
                }
            } catch(e: any) {
                 console.warn(`[PlaywrightService] Error getting iframe element handle or attributes for child frame of ${frameSelectorPath || 'main frame'}. Using name(): ${childFrame.name()}. Error: ${e.message}`);
            }

            const nextFrameSelectorPath = frameSelectorPath ? `${frameSelectorPath} >>> ${childFrameSelectorSegment}` : childFrameSelectorSegment;
            await scanFrameAndItsChildren(childFrame, nextFrameSelectorPath);
        }
    };

    // Start scanning from the main frame
    await scanFrameAndItsChildren(session.page.mainFrame(), '');

    console.log('[PlaywrightService] Total elements found across all frames:', allElements.length);
    return allElements;
  }

  async getElementScreenshot(sessionId: string, selector: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.lastActivity = Date.now();

    const element = await session.page.$(selector);
    if (!element) throw new Error('Element not found');

    const screenshot = await element.screenshot();
    return screenshot.toString('base64');
  }

  async executeAction(sessionId: string, action: string, selector?: string, value?: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.lastActivity = Date.now();
    const iframeSelector = "#web-preview-iframe";

    switch (action) {
      case 'click':
        if (!selector) throw new Error('Selector required for click action');
        const frameClick = session.page.frameLocator(iframeSelector);
        await frameClick.locator(selector).click({ timeout: 10000 });
        break;
      case 'type':
        if (!selector || !value) throw new Error('Selector and value required for type action');
        const frameType = session.page.frameLocator(iframeSelector);
        await frameType.locator(selector).fill(value, { timeout: 10000 });
        break;
      case 'select':
        if (!selector || !value) throw new Error('Selector and value required for select action');
        const frameSelect = session.page.frameLocator(iframeSelector);
        await frameSelect.locator(selector).selectOption(value, { timeout: 10000 });
        break;
      case 'wait':
        const timeout = value ? parseInt(value) : 1000;
        await session.page.waitForTimeout(timeout);
        return { success: true, action: 'wait', duration: timeout };
      case 'goto_url':
        if (!value) throw new Error('URL required for goto_url action');
        await session.page.goto(value, { waitUntil: 'networkidle' });
        return { success: true, action: 'goto_url', navigatedUrl: value };
      case 'verify_text':
        if (!selector || value === undefined) throw new Error('Selector and expected text required for verify_text action');
        const frameVerify = session.page.frameLocator(iframeSelector);
        const element = frameVerify.locator(selector);
        let actualText = await element.textContent({ timeout: 5000 }); // Prioritize textContent
        if (actualText === null || actualText.trim() === '') {
            try {
                const tagName = await element.evaluate(el => el.tagName);
                if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
                    actualText = await element.inputValue({ timeout: 5000 });
                }
            } catch (e) {
                console.warn(`Could not evaluate tagName or inputValue for selector "${selector}" in iframe, falling back to textContent. Error: ${e}`);
            }
        }
        const success = actualText?.trim() === value.trim();
        return {
          success: success,
          action: 'verify_text',
          selector: selector,
          expected: value,
          actual: actualText?.trim(),
          message: success ? 'Text verification successful.' : `Text verification failed. Expected: "${value}", Actual: "${actualText?.trim()}"`
        };
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }
}

export const playwrightService = new PlaywrightService();