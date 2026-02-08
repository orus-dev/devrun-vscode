import * as vscode from "vscode";
import { currentRun, startRun, stopRun } from "./run";
import { startServer, stopServer } from "./server";
import os from "os";
import { exec } from "child_process";
import net from "net";

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("devrun");
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
  console.log("dev-run Activated");

  // Security check - Make sure there aren't any malicious servers currently running
  const autoStart = config.get<boolean>("autoStartServer");

  canConnect(63780)
    .then((canConnect) => {
      if (canConnect) {
        console.error(
          "Unable to start due to another process listening on port 63780",
        );

        console.error("Possible malicious dev-run instance running");

        vscode.window
          .showErrorMessage(
            "Possible malicious dev-run instance running",
            "Kill the process listening on port 63780",
          )
          .then(async (response) => {
            if (!response) return;

            if (response === "Kill the process listening on port 63780") {
              await killProcessOnPort(63780);

              if (autoStart) {
                startServer(statusBarItem);
                console.log("dev-run server auto started!");
              }
            }
          });

        return;
      }

      if (autoStart) {
        startServer(statusBarItem);
        console.log("dev-run server auto started!");
      }
    })
    .catch(() => {});
}

export function deactivate() {
  stopRun();
}

export function canConnect(
  port: number,
  host = "127.0.0.1",
  timeout = 1000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.once("error", () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

export function killProcessOnPort(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const platform = os.platform();

    let cmd: string;

    if (platform === "win32") {
      // Windows
      cmd = `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /PID %a /F`;
    } else {
      // macOS / Linux
      cmd = `lsof -ti tcp:${port} | xargs kill -9`;
    }

    exec(cmd, (error) => {
      if (error) {
        resolve();
      } else {
        resolve();
      }
    });
  });
}
