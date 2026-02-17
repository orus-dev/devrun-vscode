import { WebSocket } from "ws";
import { LiveRunMove } from "./types";
import { randomUUID } from "crypto";

/* ──────────────────────────
   State
────────────────────────── */

let socket: WebSocket | null = null;
let connecting: Promise<WebSocket> | null = null;
let currentOrigin: string | null = null;

let cookies: Record<string, string> | undefined;

type PendingResolver = {
  resolve: (value: any) => void;
  reject: (err: any) => void;
  timeout: NodeJS.Timeout;
};

const pending = new Map<string, PendingResolver>();

/* ──────────────────────────
   Cookies
────────────────────────── */

export function getCookies(): Record<string, string> | undefined {
  return cookies;
}

export function setCookies(c: Record<string, string>) {
  cookies = c;
}

/* ──────────────────────────
   Utils
────────────────────────── */

function getWsOrigin(useLocalhost: boolean) {
  return useLocalhost
    ? "ws://localhost:3000/api/run"
    : "wss://dev-run.selimaj.dev/api/run";
}

function rejectAllPending(err: Error) {
  for (const { reject, timeout } of pending.values()) {
    clearTimeout(timeout);
    reject(err);
  }
  pending.clear();
}

/* ──────────────────────────
   Socket management
────────────────────────── */

async function ensureSocket(useLocalhost: boolean): Promise<WebSocket> {
  const origin = getWsOrigin(useLocalhost);

  if (
    socket &&
    socket.readyState === WebSocket.OPEN &&
    currentOrigin === origin
  ) {
    return socket;
  }

  if (connecting) {
    return connecting;
  }

  if (socket && currentOrigin !== origin) {
    socket.close();
    socket = null;
  }

  connecting = new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(origin);

    ws.onopen = async () => {
      try {
        const authCookies = getCookies();
        if (!authCookies) {
          throw new Error("Cookies not set");
        }

        socket = ws;
        currentOrigin = origin;
        connecting = null;

        await sendUnsafe(useLocalhost, {
          type: "auth",
          cookies: authCookies,
        });

        resolve(ws);
      } catch (err) {
        ws.close();
        reject(err);
      }
    };

    ws.onmessage = (e) => {
      let msg: any;
      try {
        msg = JSON.parse(e.data.toString());
      } catch {
        console.warn("Invalid WS message:", e.data);
        return;
      }

      const { requestId, ok, data, error } = msg;
      if (!requestId) return;

      const pendingReq = pending.get(requestId);
      if (!pendingReq) return;

      pending.delete(requestId);
      clearTimeout(pendingReq.timeout);

      ok ? pendingReq.resolve(data) : pendingReq.reject(error);
    };

    ws.onerror = (err) => {
      rejectAllPending(new Error("WebSocket error"));
      connecting = null;
      reject(err);
    };

    ws.onclose = () => {
      rejectAllPending(new Error("WebSocket closed"));
      socket = null;
      currentOrigin = null;
      connecting = null;
    };

    ws.on("ping", () => {
      ws.pong();
    });
  });

  return connecting;
}

/* ──────────────────────────
   RPC helpers
────────────────────────── */

async function sendUnsafe<T>(
  useLocalhost: boolean,
  payload: Record<string, any>,
): Promise<T> {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    throw new Error("WebSocket is not open");
  }

  const requestId = randomUUID();

  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error("WebSocket request timed out"));
    }, 10_000);

    pending.set(requestId, { resolve, reject, timeout });

    socket?.send(JSON.stringify({ ...payload, requestId }));
  });
}

async function send<T>(
  useLocalhost: boolean,
  payload: Record<string, any>,
): Promise<T> {
  await ensureSocket(useLocalhost);
  return sendUnsafe(useLocalhost, payload);
}

/* ──────────────────────────
   Public API
────────────────────────── */

export async function closeClient() {
  if (!socket) return;
  socket.close();
  socket = null;
  connecting = null;
}

export async function addRun(
  useLocalhost: boolean,
  problem: string,
  mode: string,
): Promise<string> {
  const data = await send<{ runId: string }>(useLocalhost, {
    type: "create",
    problem,
    category: mode,
  });

  return data.runId;
}

export async function submitRun(useLocalhost: boolean, runId: string) {
  await send(useLocalhost, {
    type: "submit",
    runId,
  });
}

export async function addRunMoves(
  useLocalhost: boolean,
  runId: string,
  file: string | null,
  language: string | null,
  moves: LiveRunMove[],
) {
  await send(useLocalhost, {
    type: "move",
    runId,
    file,
    language,
    moves,
  });
}

export async function getText(
  useLocalhost: boolean,
  runId: string,
): Promise<string> {
  return await send(useLocalhost, {
    type: "getText",
    runId,
  });
}
