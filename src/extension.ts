import * as vscode from "vscode";
import { currentRun, startRun, stopRun } from "./run";
import { startServer, stopServer } from "./server";

export function activate(context: vscode.ExtensionContext) {
  console.log("dev-run Activated");

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    10,
  );

  statusBarItem.text = "$(clock) No active run";
  statusBarItem.show();

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "devrun-vscode.startRun",
      async (problemId?: string) => startRun(statusBarItem, problemId),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("devrun-vscode.stopRun", async () => {
      if (!currentRun) return;

      const isStop = await vscode.window.showWarningMessage(
        "Are you sure you want to stop the run?",
        { modal: true },
        "Yes",
        "No",
      );

      if (isStop === "Yes") {
        stopRun();
        statusBarItem.text = "$(clock) No active run";
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("devrun-vscode.startServer", async () =>
      startServer(statusBarItem),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("devrun-vscode.stopServer", async () =>
      stopServer(statusBarItem),
    ),
  );
}

export function deactivate() {
  stopRun();
}
