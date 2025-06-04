import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from .env file
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      https: {
        key: fs.readFileSync(path.resolve(__dirname, './certificates/localhost-key.pem')),
        cert: fs.readFileSync(path.resolve(__dirname, './certificates/localhost.pem')),
      },
      port: 5173,
      proxy: {
        // Disable app proxy by using an empty target
        '/__app_proxy__': {
          target: '',
          bypass: () => false
        }
      }
    },
    define: {
      // Make environment variables available in client code
      'process.env': {
        NODE_ENV: mode,
        VITE_API_KEY: JSON.stringify(env.VITE_API_KEY || ''),
        // Add other environment variables here if needed
      }
    }
  };
});
