import type { Express } from "express";
import type { Server as HttpServer } from "http";
import { createServer as createViteServer, createLogger } from "vite";

export async function setupVite(server: HttpServer, app: Express) {
  const logger = createLogger();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "info",
  });

  app.use(vite.middlewares);

  logger.info("[vite] middleware enabled");
}
