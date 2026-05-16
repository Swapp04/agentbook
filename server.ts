/**
 * Development server only.
 * In production (Vercel), the app is served via api/index.ts as a serverless function.
 * This file adds Vite dev middleware for local development.
 */
import app from './api/index';
import dotenv from 'dotenv';
dotenv.config();

async function startDevServer() {
  const PORT = parseInt(process.env.PORT || '3000', 10);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const path = await import('path');
    const express = await import('express');
    const distPath = path.default.join(process.cwd(), 'dist');
    app.use(express.default.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.default.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startDevServer();
