import * as vscode from "vscode";
import { LiveRunMove } from "./types";
import { addRunMoves } from "./client";

export function startMonitoring(runId: string) {
  let moveId = 0;
  let moves: LiveRunMove[] = [];
  let lastLatency = Date.now();
  let idleTimeout: NodeJS.Timeout | undefined;
  let isSending = false;

  const SEND_IDLE_MS = 350;

  const flushMoves = async () => {
    if (!moves.length || isSending) return;

    isSending = true;
    const toSend = moves;
    moves = [];

    try {
      await addRunMoves(runId, toSend);
    } finally {
      isSending = false;
    }
  };

  const docSub = vscode.workspace.onDidChangeTextDocument((e) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || e.document !== editor.document) return;

    const edit = e.contentChanges[0];
    if (!edit) return;

    const now = Date.now();
    const latency = capToZeroAbove(now - lastLatency, SEND_IDLE_MS);
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

    if (idleTimeout) {
      clearTimeout(idleTimeout);
    }

    idleTimeout = setTimeout(() => {
      flushMoves();
    }, SEND_IDLE_MS);
  });

  return () => {
    docSub.dispose();
    if (idleTimeout) clearTimeout(idleTimeout);
    flushMoves();
  };
}

function capToZeroAbove(value: number, max: number) {
  return value > max ? 0 : value;
}
