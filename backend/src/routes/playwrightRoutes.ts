import { Router } from 'express';
import { playwrightService } from '../services/playwright';

const router = Router();

// Create a new Playwright session
router.post('/sessions', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required to create a session.' });
  }
  try {
    const sessionDetails = await playwrightService.createSession(url);
    // sessionDetails should be { sessionId: string; screenshot: string; title: string }
    res.status(201).json(sessionDetails); // 201 Created
  } catch (error: any) {
    console.error(`[PlaywrightRoutes] Error creating session for URL ${url}:`, error);
    res.status(500).json({ error: 'Failed to create Playwright session', details: error.message });
  }
});

// Close an existing Playwright session
router.delete('/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required to close a session.' });
  }
  try {
    await playwrightService.closeSession(sessionId);
    res.status(200).json({ message: `Session ${sessionId} closed successfully.` }); // Or 204 No Content
  } catch (error: any) {
    console.error(`[PlaywrightRoutes] Error closing session ${sessionId}:`, error);
    if (error.message.includes('Session not found')) {
         res.status(404).json({ error: error.message });
    } else {
         res.status(500).json({ error: 'Failed to close Playwright session', details: error.message });
    }
  }
});

// New route for session-based element scanning
router.get('/sessions/:sessionId/elements', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required to scan elements.' });
  }
  try {
    // Optional: could also pass req.query.url if the page needs to be navigated first
    // For now, assume the session's page is already at the correct URL.
    const elements = await playwrightService.scanElements(sessionId);
    res.status(200).json({ elements });
  } catch (error: any) {
    console.error(`[PlaywrightRoutes] Error scanning elements for session ${sessionId}:`, error);
    if (error.message.includes('Session not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to scan elements', details: error.message });
    }
  }
});

router.post('/sessions/:sessionId/actions', async (req, res) => {
  const { sessionId } = req.params;
  const { action, selector, value } = req.body; // 'value' is versatile

  if (!sessionId || !action) {
    return res.status(400).json({ error: 'Session ID and action are required.' });
  }

  try {
    // The 'value' field from req.body will be used for different purposes:
    // - For 'type', 'select', 'verify_text': it's the text/option value.
    // - For 'goto_url': it's the URL.
    // - For 'wait': it's the duration in milliseconds (if provided, else service default).
    // 'selector' is used for element-specific actions like 'click', 'type', 'select', 'verify_text'.

    console.log(`Executing action: ${action} for session ${sessionId} with selector: ${selector} and value: ${value}`);
    const result = await playwrightService.executeAction(sessionId, action, selector, value);
    res.status(200).json(result);
  } catch (error: any) {
    console.error(`[PlaywrightRoutes] Error executing action '${action}' for session ${sessionId}:`, error.message);
    // More detailed error logging for debugging:
    // console.error(error);

    if (error.message.includes('Session not found')) {
      res.status(404).json({ error: error.message, action: action });
    } else if (error.message.includes('Unsupported action') ||
               error.message.includes('required for') || // Covers "Selector required for..." etc.
               error.message.includes('URL required for') ||
               error.message.includes('Selector and expected text required for')) {
      res.status(400).json({ error: error.message, action: action });
    } else {
      res.status(500).json({ error: 'Failed to execute action', details: error.message, action: action });
    }
  }
});

export default router;
