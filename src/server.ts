import * as vscode from "vscode";
import express from "express";
import * as http from "http";
import cors from "cors";
import { getCookies, setCookies } from "./client";

var server: http.Server | undefined;

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin === "https://dev-run.selimaj.dev"
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

app.post("/auth", (req, res) => {
  const { saveCookies } = req.body;

  setCookies(saveCookies);

  res.json({ ok: true });
});

app.get("/start-run/:problemId", (req, res) => {
  const { problemId } = req.params;

  if (!getCookies()) return res.json({ ok: false, code: "auth" });

  vscode.commands.executeCommand("devrun-vscode.startRun", problemId);

  res.json({ ok: true, problemId });
});

export async function startServer(statusBarItem: vscode.StatusBarItem) {
  if (server) return;

  statusBarItem.text = "$(clock) Starting server";

  server = app.listen(63780, "127.0.0.1", () => {
    setTimeout(() => (statusBarItem.text = "$(clock) No active run"), 500);
  });

  await vscode.commands.executeCommand(
    "setContext",
    "devrun.serverActive",
    true,
  );
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

  await vscode.commands.executeCommand(
    "setContext",
    "devrun.serverActive",
    false,
  );
}
