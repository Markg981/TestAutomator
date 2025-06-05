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
        await this.closeSession(sessionId);
      }
    }
  }

  async createSession(url: string): Promise<{ sessionId: string; screenshot: string; title: string }> {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      const screenshot = await page.screenshot({ fullPage: true });
      const title = await page.title();
      
      const sessionId = Date.now().toString();
      this.sessions.set(sessionId, {
        browser,
        page,
        lastActivity: Date.now()
      });

      return {
        sessionId,
        screenshot: screenshot.toString('base64'),
        title
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
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

    return await session.page.evaluate(() => {
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

      function getCssSelector(element: Element): string {
        if (element.id) return `#${element.id}`;
        
        const paths: string[] = [];
        let current = element;
        
        while (current.parentNode instanceof Element) {
          let selector = current.tagName.toLowerCase();
          
          if (current.id) {
            paths.unshift(`#${current.id}`);
            break;
          } else if (current.classList.length > 0) {
            selector += `.${Array.from(current.classList).join('.')}`;
          }
          
          paths.unshift(selector);
          current = current.parentNode;
        }
        
        return paths.join(' > ');
      }

      const elements = document.querySelectorAll<HTMLElement>('input, button, a, select, textarea, [role="button"], [role="link"], [role="tab"], [data-testid], p, h1, h2, h3, h4, h5, h6, div[id], span[id]');
      return Array.from(elements).map(el => {
        const rect = el.getBoundingClientRect();
        const attributes: Record<string, string> = {};
        Array.from(el.attributes).forEach(attr => {
          attributes[attr.name] = attr.value;
        });

        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || undefined,
          classes: Array.from(el.classList),
          text: el.textContent?.trim() || undefined,
          attributes,
          xpath: getXPath(el),
          selector: getCssSelector(el),
          boundingBox: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          }
        };
      });
    });
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

  async executeAction(sessionId: string, action: string, selector?: string, value?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.lastActivity = Date.now();

    switch (action) {
      case 'click':
        if (!selector) throw new Error('Selector required for click action');
        await session.page.click(selector);
        break;
      case 'type':
        if (!selector || !value) throw new Error('Selector and value required for type action');
        await session.page.fill(selector, value);
        break;
      case 'select':
        if (!selector || !value) throw new Error('Selector and value required for select action');
        await session.page.selectOption(selector, value);
        break;
      case 'wait':
        const timeout = value ? parseInt(value) : 1000;
        await session.page.waitForTimeout(timeout);
        break;
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }
}

export const playwrightService = new PlaywrightService(); 