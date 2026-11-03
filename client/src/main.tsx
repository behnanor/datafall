// Must be first: caps requestAnimationFrame before animation libraries load.
import "./lib/fpsLimiter";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
