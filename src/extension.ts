import * as vscode from "vscode";
import { currentRun, startRun, stopRun } from "./run";

export function activate(context: vscode.ExtensionContext) {
  console.log("dev-run Activated");

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    10,
  );

  statusBarItem.text = "$(clock) No run yet";
  statusBarItem.show();

  context.subscriptions.push(
    vscode.commands.registerCommand("devrun-vscode.startRun", async () => {
      if (currentRun) {
        vscode.window.showErrorMessage("You are already in a run");
        return;
      }

      const problemId = await vscode.window.showInputBox({
        prompt: "Enter a valid problem ID",
        placeHolder: "my-problem",
        validateInput: (text) => {
          return text.match(/^[a-zA-Z0-9-]+$/)
            ? null
            : "Must only contain '-' and alphanumeric characters";
        },
      });

      if (!problemId) {
        return;
      }

      startRun(statusBarItem, problemId);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("devrun-vscode.stopRun", async () => {
      const isStop = await vscode.window.showWarningMessage(
        "Are you sure you want to stop the run?",
        { modal: true },
        "Yes",
        "No",
      );

      if (isStop === "Yes") {
        stopRun();
        statusBarItem.text = "$(clock) No run yet";
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("devrun-vscode.startServer", async () => {
      
    }),
  );
}

export function deactivate() {
  stopRun();
}
