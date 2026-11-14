import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { handleApiRequest } from './apiHandlers';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
app.use(express.json());

const dispatchApi = async (req: express.Request, res: express.Response) => {
  const result = await handleApiRequest(req.path, req.method, req.body);
  res.status(result.status).json(result.body);
};

app.all('/api/health', dispatchApi);
app.all('/api/underwrite', dispatchApi);
app.all('/api/grant-narrative', dispatchApi);
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CivicStack server listening on port ${port}`);
  });
}

startServer();
