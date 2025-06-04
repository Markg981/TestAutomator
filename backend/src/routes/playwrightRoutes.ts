import { Router } from 'express';
import playwrightService from '../services/playwright';

const router = Router();

router.post('/detect-elements', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let sessionId: string | null = null;

  try {
    const sessionDetails = await playwrightService.createSession(url);
    sessionId = sessionDetails.sessionId;

    const elements = await playwrightService.scanElements(sessionId);

    await playwrightService.closeSession(sessionId);
    // Reset sessionId after closing to avoid trying to close it again in finally
    sessionId = null;

    res.status(200).json({ elements });
  } catch (error) {
    console.error('Failed to detect elements:', error);
    if (sessionId) {
      try {
        await playwrightService.closeSession(sessionId);
      } catch (closeError) {
        console.error('Failed to close session during error handling:', closeError);
      }
    }
    res.status(500).json({ error: 'Failed to detect elements' });
  }
});

export default router;
