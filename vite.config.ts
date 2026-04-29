import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import string from 'vite-plugin-string'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

type ApiHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

const loadApiRoute = (path: string) =>
  import(/* @vite-ignore */ pathToFileURL(resolve(process.cwd(), path)).href) as Promise<{ default: ApiHandler }>;

const apiRoutes: Record<string, () => Promise<{ default: ApiHandler }>> = {
  '/api/asteroids': () => loadApiRoute('./api/asteroids.js'),
  '/api/close-approaches': () => loadApiRoute('./api/close-approaches.js'),
  '/api/missions': () => loadApiRoute('./api/missions.js'),
  '/api/satellites': () => loadApiRoute('./api/satellites.js'),
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'space-apps-api-dev',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url ?? '/', 'http://localhost');
          const loadHandler = apiRoutes[url.pathname];
          if (!loadHandler) {
            next();
            return;
          }

          const { default: handler } = await loadHandler();
          await handler(req, res);
        });
      },
    },
    react(),
    string({
      include: '**/*.glsl'
    })
  ],
})
