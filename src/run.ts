import * as vscode from "vscode";
import { addRun, submitRun } from "./client";

export var currentRun: {
  interval: NodeJS.Timeout;
  problemId: string;
  start: Date;
  id: string;
} | null = null;

export async function startRun(
  statusBarItem: vscode.StatusBarItem,
  problemId?: string,
) {
  if (currentRun) {
    vscode.window.showErrorMessage("You are already in a run");
    return;
  }

  if (!problemId) {
    problemId = await vscode.window.showInputBox({
      prompt: "Enter a valid problem ID",
      placeHolder: "my-problem",
      validateInput: (text) => {
        return text.match(/^[a-zA-Z0-9-]+$/)
          ? null
          : "Must only contain '-' and alphanumeric characters";
      },
    });
  }

  if (!problemId) return;

  const mode = await vscode.window.showQuickPick(["any%", "100%"], {
    placeHolder: "Select a mode",
    canPickMany: false,
  });

  if (!mode) return;

  const runId = await addRun(problemId, mode);

  let start = Date.now();

  currentRun = {
    id: runId,
    problemId,
    start: new Date(),
    interval: setInterval(() => {
      const elapsed = Date.now() - start;

      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      const hundredths = Math.floor((elapsed % 1000) / 10);

      statusBarItem.text = `$(clock) ${minutes}:${seconds.toString().padStart(2, "0")}.${hundredths
        .toString()
        .padStart(2, "0")}`;
    }, 50),
  };

  await vscode.commands.executeCommand("setContext", "devrun.runActive", true);
}

export async function stopRun() {
  if (currentRun) {
    clearTimeout(currentRun.interval);
    submitRun(currentRun.id);
    currentRun = null;
  }

  await vscode.commands.executeCommand("setContext", "devrun.runActive", false);
}
