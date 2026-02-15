import { WebSocket } from "ws";
import { LiveRunMove } from "./types";
import { randomUUID } from "crypto";

let socket: WebSocket | null = null;
let cookies: Record<string, string> | undefined;

type PendingResolver = {
  resolve: (value: any) => void;
  reject: (err: any) => void;
};

const pending = new Map<string, PendingResolver>();

export function getCookies(): Record<string, string> | undefined {
  return cookies;
}

export function setCookies(c: Record<string, string>) {
  cookies = c;
}

function getWsOrigin(useLocalhost: boolean) {
  return useLocalhost
    ? "ws://localhost:3000/api/run"
    : "wss://dev-run.selimaj.dev/api/run";
}

async function ensureSocket(useLocalhost: boolean): Promise<WebSocket> {
  if (
    socket &&
    socket.url === getWsOrigin(useLocalhost) &&
    socket.readyState === WebSocket.OPEN
  ) {
    return socket;
  }

  if (socket && socket.url !== getWsOrigin(useLocalhost)) {
    socket.close();
  }

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(getWsOrigin(useLocalhost));

    ws.onopen = async () => {
      socket = ws;

      console.log("Authenticating with cookies:", getCookies());

      await sendUnsafe(useLocalhost, { cookies: getCookies() });

      resolve(ws);
    };

    ws.onerror = (err) => {
      reject(err);
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data.toString());
      const { requestId, ok, data, error } = msg;

      if (!requestId) return;

      const pendingReq = pending.get(requestId);
      if (!pendingReq) return;

      pending.delete(requestId);

      ok ? pendingReq.resolve(data) : pendingReq.reject(error);
    };

    ws.onclose = () => {
      socket = null;
    };
  });
}

async function sendUnsafe<T>(
  useLocalhost: boolean,
  payload: Record<string, any>,
): Promise<T> {
  if (!socket) {
    throw new Error("WebSocket is not connected");
  }

  const requestId = randomUUID();

  return new Promise<T>((resolve, reject) => {
    pending.set(requestId, { resolve, reject });
    socket?.send(JSON.stringify({ ...payload, requestId }));
  });
}

async function send<T>(
  useLocalhost: boolean,
  payload: Record<string, any>,
): Promise<T> {
  await ensureSocket(useLocalhost);
  return await sendUnsafe(useLocalhost, payload);
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
