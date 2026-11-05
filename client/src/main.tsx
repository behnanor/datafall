// Must be first: caps requestAnimationFrame before animation libraries load.
import "./lib/fpsLimiter";
import "./lib/displayPrefs";
import { installGlobalErrorLogging } from "./lib/errorLog";
import "./index.css";
import { createRoot } from "react-dom/client";

installGlobalErrorLogging();

async function bootstrap() {
  const { default: App } = await import("./App");
  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
