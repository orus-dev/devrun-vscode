import * as vscode from "vscode";
import express from "express";
import * as http from "http";
import cors from "cors";

let server: http.Server | undefined;

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (e.g., direct curl)
      if (
        !origin ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

app.get("/start-run/:problemId", (req, res) => {
  const { problemId } = req.params;

  // trigger VS Code command
  vscode.commands.executeCommand("devrun-vscode.startRun", problemId);

  res.json({ ok: true, problemId });
});

export async function startServer(statusBarItem: vscode.StatusBarItem) {
  if (server) return;

  statusBarItem.text = "$(clock) Starting server";

  server = app.listen(63780, "127.0.0.1", () => {
    setTimeout(() => (statusBarItem.text = "$(clock) No active run"), 500);
  });
}

export async function stopServer(statusBarItem: vscode.StatusBarItem) {
  if (!server) {
    return;
  }

  statusBarItem.text = "$(clock) Stopping server";

  await new Promise<void>((resolve) => {
    server!.close(() => resolve());
  });

  server = undefined;
  setTimeout(() => (statusBarItem.text = "$(clock) No active run"), 500);
}
