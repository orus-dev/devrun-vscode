import * as vscode from "vscode";
import { LiveRunMove } from "./types";
import { addRunMoves } from "./client";
import { randomInt } from "crypto";

let lastText = "";
let lastCursor = 0;
let moveId = 0;

export function startMonitoring(runId: string) {
  lastText = "";

  return setInterval(() => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const currentText = editor.document.getText();
    const cursorOffset = editor.document.offsetAt(editor.selection.active);

    let change: { from: number; to: number; insert: string } | undefined;

    if (currentText !== lastText) {
      let start = 0;
      while (
        start < lastText.length &&
        start < currentText.length &&
        lastText[start] === currentText[start]
      ) {
        start++;
      }

      let endOld = lastText.length - 1;
      let endNew = currentText.length - 1;
      while (
        endOld >= start &&
        endNew >= start &&
        lastText[endOld] === currentText[endNew]
      ) {
        endOld--;
        endNew--;
      }

      change = {
        from: start,
        to: endOld + 1, // ⚡ correct range in old text
        insert: currentText.slice(start, endNew + 1),
      };

      lastText = currentText;
    }

    const move: LiveRunMove = {
      latency: 300,
      cursor: cursorOffset,
      changes: change,
      moveId,
    };

    if (move.changes || move.cursor !== lastCursor) {
      addRunMoves(runId, [move]);
    }

    lastCursor = move.cursor;
  }, 1000);
}
