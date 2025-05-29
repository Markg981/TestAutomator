
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { URL } from 'url'; // Node.js URL module

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', ''); // For process.env.API_KEY

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/__app_proxy__': {
          target: 'http://example.com', // Placeholder, overridden per request
          changeOrigin: true, // Critical: updates Host header, also influences Origin with some servers
          secure: false, // Allow proxying to HTTPS with self-signed certs
          xfwd: true,    // Adds X-Forwarded-For, X-Forwarded-Proto, X-Forwarded-Host
          configure: (proxy /*, outerOptions */) => {
            proxy.on('proxyReq', (proxyReq, req, res, requestSpecificOptions) => {
              console.log(`[VITE PROXY] Original request URL: ${req.url}`);
              if (req.url) {
                const encodedExternalUrlWithPossiblePath = req.url.substring('/__app_proxy__/'.length);
                const externalUrlString = decodeURIComponent(encodedExternalUrlWithPossiblePath);
                console.log(`[VITE PROXY] Decoded external URL: ${externalUrlString}`);

                try {
                  const targetUrl = new URL(externalUrlString);

                  // Override target for this specific request
                  requestSpecificOptions.target = {
                    protocol: targetUrl.protocol,
                    host: targetUrl.hostname, // e.g., 'localhost'
                    port: targetUrl.port,     // e.g., '62701'
                  };
                  
                  proxyReq.path = targetUrl.pathname + targetUrl.search;
                  
                  // Explicitly set Host header to the actual target's host (hostname:port)
                  proxyReq.setHeader('Host', targetUrl.host); 
                                    
                  // Set Origin and Referer to match the target
                  proxyReq.setHeader('Origin', targetUrl.origin);
                  proxyReq.setHeader('Referer', targetUrl.origin); 
                  
                  // Forward User-Agent
                  if (req.headers['user-agent']) {
                    proxyReq.setHeader('User-Agent', req.headers['user-agent']);
                  }
                  
                  // Forward common authentication headers if present
                  if (req.headers.cookie) {
                    proxyReq.setHeader('Cookie', req.headers.cookie);
                    console.log('[VITE PROXY] Forwarding Cookie header.');
                  }
                  if (req.headers.authorization) {
                    proxyReq.setHeader('Authorization', req.headers.authorization);
                    console.log('[VITE PROXY] Forwarding Authorization header.');
                  }

                  console.log(`[VITE PROXY] Proxying to: ${targetUrl.protocol}//${targetUrl.host}${proxyReq.path}`);
                  console.log(`[VITE PROXY] Headers being sent to target:`, proxyReq.getHeaders());

                } catch (e) {
                  console.error(`[VITE PROXY] Invalid URL for proxy: "${externalUrlString}"`, e);
                  // Fallback target for requestSpecificOptions if URL parsing fails
                  requestSpecificOptions.target = { protocol: 'http:', host: 'example.com', port: '80' };
                  proxyReq.path = '/error-invalid-proxy-url';
                  if (res && !res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                  }
                  if (res && !res.writableEnded) {
                    res.end('Invalid URL provided to proxy.');
                  }
                }
              } else {
                 // Fallback if req.url is somehow undefined
                 requestSpecificOptions.target = { protocol: 'http:', host: 'example.com', port: '80' };
                 proxyReq.path = '/error-missing-proxy-url';
              }
            });

            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log(`[VITE PROXY] Received response from target: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
              console.log(`[VITE PROXY] Target response headers:`, proxyRes.headers);

              delete proxyRes.headers['x-frame-options'];
              delete proxyRes.headers['X-Frame-Options'];
              delete proxyRes.headers['content-security-policy'];
              delete proxyRes.headers['Content-Security-Policy'];
            });

            proxy.on('error', (err, req, res) => {
              console.error('[VITE PROXY] Proxy error:', err);
              if (res && typeof res.writeHead === 'function' && !res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
              }
              if (res && typeof res.end === 'function' && !res.writableEnded) {
                res.end('Proxy error: ' + err.message);
              }
            });
          },
        },
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || '')
    }
  };
});
