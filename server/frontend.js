import express from "express";
import fs from "node:fs";

export function registerFrontend(app, distDir, indexHtmlPath) {
  app.use(express.static(distDir));

  app.get("/{*splat}", (req, res) => {
    if (!fs.existsSync(indexHtmlPath)) {
      return res.status(500).json({
        error: "Missing frontend build",
        message: "Run npm run build before starting the production server.",
      });
    }

    return res.sendFile(indexHtmlPath);
  });
}