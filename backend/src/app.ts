import express from 'express';
import cors from 'cors';
import sessionRoutes from './routes/sessionRoutes';
import geminiRoutes from './routes/geminiRoutes';
import playwrightRoutes from './routes/playwrightRoutes'; // Added import
import authRoutes, { verifyToken } from './routes/authRoutes';
import testRoutes from './routes/testRoutes';

const app = express();

// Configure CORS
app.use(cors({
  origin: [
    'https://localhost:5173',
    'https://localhost:5174',
    'https://localhost:62701'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

// Cookie parser middleware
app.use(express.json());

// Configurazione cookie sicuri
app.set('trust proxy', 1); // trust first proxy
app.use((req, res, next) => {
  res.cookie('scanner', '', {
    secure: true, // Richiede HTTPS
    sameSite: 'none', // Permette cookie cross-origin
    domain: 'localhost',
    path: '/',
    httpOnly: true // Previene l'accesso via JavaScript
  });
  next();
});

// Publicly accessible test routes (specifically GET for loading)
// Other test routes (POST, PUT, DELETE) within testRoutes will be hit first,
// and if they don't match, subsequent middleware might apply if paths overlap.
// However, verifyToken below is more specific to other /api sub-routes.
app.use('/api/tests', testRoutes);

// Auth routes (non protette)
app.use('/api/auth', authRoutes);

// Middleware di autenticazione per tutte le ALTRE route /api/* (excluding /api/auth and /api/tests which are already handled)
app.use('/api', verifyToken);

// Routes protette (verifyToken will apply to these if not handled above)
app.use('/api/session', sessionRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/playwright', playwrightRoutes); // Added playwright routes

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error in app.ts:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

export default app; 