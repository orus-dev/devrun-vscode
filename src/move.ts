import * as vscode from "vscode";
import { diff_match_patch, Diff } from "diff-match-patch";
import { LiveRunMove } from "./types";
import { addRunMoves } from "./client";

export function startMonitoring(runId: string) {
  const dmp = new diff_match_patch();

  let moveId = 0;
  let moves: LiveRunMove[] = [];

  let lastText = "";
  let lastEventTime = Date.now();
  let idleTimeout: NodeJS.Timeout | undefined;
  let isSending = false;

  const IDLE_MS = 350;

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    lastText = editor.document.getText();
  }

  async function flush() {
    if (!moves.length || isSending) return;

    isSending = true;
    const batch = moves;
    moves = [];

    try {
      await addRunMoves(runId, batch);
    } finally {
      isSending = false;
    }
  }

  const readInterval = setInterval(() => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const newText = editor.document.getText();
    if (newText === lastText) return;

    const now = Date.now();
    const latency = capLatency(now - lastEventTime, IDLE_MS);
    lastEventTime = now;

    const diffs = dmp.diff_main(lastText, newText);
    dmp.diff_cleanupEfficiency(diffs);

    const changes = diffsToChanges(diffs);

    lastText = newText;

    for (const change of changes) {
      moves.push({
        moveId: moveId++,
        latency,
        cursor: editor.document.offsetAt(editor.selection.active),
        changes: change,
      });
    }

    if (idleTimeout) clearTimeout(idleTimeout);
    idleTimeout = setTimeout(flush, IDLE_MS);
  }, 500);

  return () => {
    clearInterval(readInterval);
    if (idleTimeout) clearTimeout(idleTimeout);
    flush();
  };
}

function diffsToChanges(diffs: Diff[]) {
  const changes: {
    from: number;
    to: number;
    insert: string;
  }[] = [];

  let offset = 0;

  for (const [op, text] of diffs) {
    if (op === 0) {
      // equal
      offset += text.length;
    } else if (op === -1) {
      // delete
      changes.push({
        from: offset,
        to: offset + text.length,
        insert: "",
      });
    } else if (op === 1) {
      // insert
      changes.push({
        from: offset,
        to: offset,
        insert: text,
      });
      offset += text.length;
    }
  }

  return changes;
}

function capLatency(value: number, max: number) {
  return value > max ? 0 : value;
}
