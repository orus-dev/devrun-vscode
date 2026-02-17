import * as vscode from "vscode";
import { diff_match_patch, Diff } from "diff-match-patch";
import { LiveRunMove } from "./types";
import { addRunMoves, getText } from "./client";
import path from "path";

export function startMonitoring(useLocalhost: boolean, runId: string) {
  const dmp = new diff_match_patch();

  let moveId = 0;
  let moves: LiveRunMove[] = [];

  let lastText = "";
  let lastCursorOffset: number | undefined;
  let lastEventTime = Date.now();
  let idleTimeout: NodeJS.Timeout | undefined;
  let isSending = false;

  const IDLE_MS = 350;

  if (vscode.window.activeTextEditor) {
    const editor = vscode.window.activeTextEditor;
    lastText = editor.document.getText();
    lastCursorOffset = editor.document.offsetAt(editor.selection.active);
  }

  async function flush(file: string | null, language: string | null) {
    if (!moves.length || isSending) return;

    isSending = true;
    const batch = moves;
    moves = [];

    try {
      await addRunMoves(useLocalhost, runId, file, language, batch);
    } finally {
      isSending = false;
    }
  }

  function getLatency(): number {
    const now = Date.now();
    const latency = capLatency(now - lastEventTime, IDLE_MS);
    lastEventTime = now;
    return latency;
  }

  // --- Existing text change interval ---
  const readInterval = setInterval(() => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const newText = editor.document.getText();
    if (newText !== lastText) {
      let latency = getLatency();

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
      idleTimeout = setTimeout(
        () =>
          flush(
            path.basename(editor?.document.fileName || "") || null,
            editor?.document.languageId || null,
          ),
        IDLE_MS,
      );
    }
  }, 500);

  // --- New cursor tracking interval ---
  const cursorInterval = setInterval(() => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const cursorOffset = editor.document.offsetAt(editor.selection.active);

    if (cursorOffset !== lastCursorOffset) {
      const latency = getLatency();

      moves.push({
        moveId: moveId++,
        latency,
        cursor: cursorOffset,
      });

      lastCursorOffset = cursorOffset;

      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(
        () =>
          flush(
            path.basename(editor.document.fileName || "") || null,
            editor.document.languageId || null,
          ),
        IDLE_MS,
      );
    }
  }, 1000); // every second

  // Sync text every 5 seconds to prevent desync
  const textStabilityInterval = setInterval(async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const serverText = await getText(useLocalhost, runId);

    const editorText = editor.document.getText();
    if (editorText !== serverText) {
      clearTimeout(idleTimeout);
      moves = [
        {
          latency: 0,
          cursor: editor.document.offsetAt(editor.selection.active),
          moveId: moveId++,
          changes: {
            from: 0,
            to: serverText?.length || 0,
            insert: editorText,
          },
        },
      ];
      flush(
        path.basename(editor?.document.fileName || "") || null,
        editor?.document.languageId || null,
      );
    }
  }, 5000); // every 5 seconds

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    let latency = getLatency();

    if (idleTimeout) clearTimeout(idleTimeout);

    moves = [];

    moves.push({
      moveId: moveId++,
      latency,
      cursor: editor?.document.offsetAt(editor.selection.active) || 0,
    });

    flush(
      path.basename(editor?.document.fileName || "") || null,
      editor?.document.languageId || null,
    );
  });

  return () => {
    clearInterval(textStabilityInterval);
    clearInterval(readInterval);
    clearInterval(cursorInterval);
    if (idleTimeout) clearTimeout(idleTimeout);
    flush(
      path.basename(vscode.window.activeTextEditor?.document.fileName || "") ||
        null,
      vscode.window.activeTextEditor?.document.languageId || null,
    );
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
