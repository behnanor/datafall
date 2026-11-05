import type { Express } from "express";
import type { Server as HttpServer } from "http";

export async function setupVite(httpServer: HttpServer, app: Express) {
  // Dynamic import so this never runs/loads in production
  const vite = await import("vite");

  const viteServer = await vite.createServer({
    server: {
      middlewareMode: true,
      hmr: {
        server: httpServer,
      },
    },
    appType: "custom",
  });

  app.use(viteServer.middlewares);
}
