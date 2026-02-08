import * as vscode from "vscode";

export var currentRun: {
  interval: NodeJS.Timeout;
  problemId: string;
  start: Date;
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

  let start = Date.now();

  currentRun = {
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
}

export async function stopRun() {
  if (currentRun) {
    clearTimeout(currentRun.interval);
    currentRun = null;
  }
}
