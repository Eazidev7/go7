// Create a minimal HTTP server that redirects all requests to the local Vite server
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 8888;
const TARGET = 'http://localhost:5191'; // The Vite server port

// Redirect all requests to the actual Vite server
app.use('/', createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  ws: true,
  logLevel: 'debug'
}));

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Redirecting all requests to ${TARGET}`);
});