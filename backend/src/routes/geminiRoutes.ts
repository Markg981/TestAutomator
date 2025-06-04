import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// Inizializza il client Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

router.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      console.warn('[Gemini] API key not found in environment variables');
      return res.status(500).json({ 
        error: 'Gemini API key not configured',
        text: 'Natural language processing is not available. Please configure the Gemini API key.'
      });
    }

    if (!prompt) {
      return res.status(400).json({ 
        error: 'Prompt is required',
        text: 'Please provide a prompt for text generation.'
      });
    }

    console.log('[Gemini] Generating response for prompt:', prompt);
    
    // Per il modello text-only
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('[Gemini] Generated response length:', text.length);
    
    res.json({ text });
  } catch (error) {
    console.error('[Gemini] Error generating response:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      text: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router; 