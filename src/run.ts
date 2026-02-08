import * as vscode from "vscode";

export var currentRun: NodeJS.Timeout | null = null;

export async function stopRun() {
  
  if (currentRun) clearTimeout(currentRun);
}

export async function startRun(
  statusBarItem: vscode.StatusBarItem,
  problemId: string,
) {
  const mode = await vscode.window.showQuickPick(["any%", "100%"], {
    placeHolder: "Select a mode",
    canPickMany: false,
  });

  let start = Date.now();

  currentRun = setInterval(() => {
    const elapsed = Date.now() - start;

    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const hundredths = Math.floor((elapsed % 1000) / 10);

    statusBarItem.text = `$(clock) ${minutes}:${seconds.toString().padStart(2, "0")}.${hundredths
      .toString()
      .padStart(2, "0")}`;
  }, 50);
}
