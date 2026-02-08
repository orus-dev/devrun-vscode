import * as vscode from "vscode";
import { LiveRunMove } from "./types";
import { addRunMoves } from "./client";

export function startMonitoring(runId: string) {
  let moveId = 0;
  let moves: LiveRunMove[] = [];
  let lastLatency = Date.now();

  const docSub = vscode.workspace.onDidChangeTextDocument((e) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || e.document !== editor.document) return;

    const edit = e.contentChanges[0];
    if (!edit) return;

    const now = Date.now();
    const latency = capToZeroAbove(now - lastLatency, 350);
    lastLatency = now;

    const cursorOffset = editor.document.offsetAt(editor.selection.active);

    moves.push({
      latency,
      cursor: cursorOffset,
      changes: {
        from: edit.rangeOffset,
        to: edit.rangeOffset + edit.rangeLength,
        insert: edit.text,
      },
      moveId: moveId++,
    });
  });

  const sendInterval = setInterval(() => {
    if (moves.length) {
      addRunMoves(runId, moves);
      moves = [];
    }
  }, 3000);

  return () => {
    docSub.dispose();
    clearInterval(sendInterval);
  };
}

function capToZeroAbove(value: number, max: number) {
  return value > max ? 0 : value;
}
