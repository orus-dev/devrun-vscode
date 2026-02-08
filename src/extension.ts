import * as vscode from "vscode";
import { startRun } from "./startRun";

export function activate(context: vscode.ExtensionContext) {
  console.log("dev-run Activated");

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    10,
  );

  statusBarItem.text = "$(clock) No run yet";
  statusBarItem.show();

  let disposable = vscode.commands.registerCommand(
    "devrun-vscode.startRun",
    async () => {
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
    },
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
