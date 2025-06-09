import { Router } from 'express';
import { playwrightService } from '../services/playwright';

const router = Router();

// Route to get elements from an existing session
router.get('/sessions/:sessionId/elements', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required to detect elements.' });
  }

  try {
    const elements = await playwrightService.scanElements(sessionId);
    res.status(200).json({ elements });
  } catch (error: any) {
    console.error(`[PlaywrightRoutes] Error scanning elements for session ${sessionId}: ${error.message}`);
    if (error.message.includes('Session not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to scan elements', details: error.message });
    }
  }
});

// Route to execute actions in an existing session
router.post('/sessions/:sessionId/actions', async (req, res) => {
  const { sessionId } = req.params;
  const { action, selector, value } = req.body;

  if (!sessionId || !action) {
    return res.status(400).json({ error: 'Session ID and action are required.' });
  }

  console.log(`[PlaywrightRoutes] Session ${sessionId}: Executing action '${action}', Selector: '${selector}', Value: '${value}'`);

  try {
    const result = await playwrightService.executeAction(sessionId, action, selector, value);
    res.status(200).json(result);
  } catch (error: any) {
    console.error(`[PlaywrightRoutes] Session ${sessionId}: Error executing action '${action}'. Selector: '${selector}'. Value: '${value}'. Error: ${error.message}`);
    // Simplified error handling for this attempt
    if (error.message.includes('Session not found')) {
      res.status(404).json({ error: error.message, actionExecuted: action });
    } else if (error.message.includes('Unsupported action') || error.message.toLowerCase().includes('required for')) {
      res.status(400).json({ error: error.message, actionExecuted: action });
    } else {
      res.status(500).json({ error: 'Failed to execute action', details: error.message, actionExecuted: action });
    }
  }
});

// Route to create a new Playwright session
router.post('/sessions', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required to create a session.' });
  }
  try {
    console.log(`[PlaywrightRoutes] Creating session for URL: ${url}`);
    const sessionDetails = await playwrightService.createSession(url);
    res.status(201).json(sessionDetails);
  } catch (error: any) {
    console.error(`[PlaywrightRoutes] Error creating session for URL ${url}: ${error.message}`);
    res.status(500).json({ error: 'Failed to create Playwright session', details: error.message });
  }
});

// Route to close an existing Playwright session
router.delete('/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) {
    // This check is belt-and-suspenders as Express path params usually ensure presence
    return res.status(400).json({ error: 'Session ID is required to close a session.' });
  }
  try {
    console.log(`[PlaywrightRoutes] Closing session: ${sessionId}`);
    await playwrightService.closeSession(sessionId);
    res.status(200).json({ message: `Session ${sessionId} closed successfully.` });
  } catch (error: any) {
    console.error(`[PlaywrightRoutes] Error closing session ${sessionId}: ${error.message}`);
    if (error.message.includes('Session not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to close Playwright session', details: error.message });
    }
  }
});

// Ensure the old '/detect-elements' route that managed its own session is definitely removed or commented out.
/*
router.post('/detect-elements', async (req, res) => {
  // ... old implementation details ...
});
*/

export default router;
