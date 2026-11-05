// Must be first: caps requestAnimationFrame before animation libraries load.
import "./lib/fpsLimiter";
import "./lib/displayPrefs";
import "./index.css";
import { createRoot } from "react-dom/client";

async function bootstrap() {
  const { default: App } = await import("./App");
  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
