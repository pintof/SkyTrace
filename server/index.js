import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerFrontend } from "./frontend.js";
import { registerRoutes } from "./routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const indexHtmlPath = path.join(distDir, "index.html");

const app = express();
const lifecycleEvent = process.env.npm_lifecycle_event || "";
const serverMode =
  process.env.SERVER_MODE || (lifecycleEvent === "dev:server" ? "api" : "full");
const isApiOnlyMode = serverMode === "api";
const port = Number(
  isApiOnlyMode ? process.env.API_PORT || 3001 : process.env.PORT || 3000,
);

app.use(express.json());

registerRoutes(app);

if (!isApiOnlyMode) {
  registerFrontend(app, distDir, indexHtmlPath);
}

app.listen(port, () => {
  console.log(
    `SkyTrace ${isApiOnlyMode ? "API" : "server"} listening on http://localhost:${port}`,
  );
});
