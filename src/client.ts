import { WebSocket } from "ws";
import { LiveRunMove } from "./types";
import { randomUUID } from "crypto";

let socket: WebSocket | null = null;
let cookies: string | undefined;

type PendingResolver = {
  resolve: (value: any) => void;
  reject: (err: any) => void;
};

const pending = new Map<string, PendingResolver>();

export function getCookies(): string | undefined {
  return cookies;
}

export function setCookies(c: string) {
  cookies = c;
}

function getWsOrigin(useLocalhost: boolean) {
  return useLocalhost
    ? "ws://localhost:3000/api/run"
    : "wss://dev-run.selimaj.dev/api/run";
}

function ensureSocket(useLocalhost: boolean): WebSocket {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return socket;
  }

  socket = new WebSocket(getWsOrigin(useLocalhost));

  socket.onmessage = (e) => {
    const msg = JSON.parse(e.data.toString());
    const { requestId, ok, data, error } = msg;

    if (!requestId) return;

    const pendingReq = pending.get(requestId);
    if (!pendingReq) return;

    pending.delete(requestId);

    ok ? pendingReq.resolve(data) : pendingReq.reject(error);
  };

  socket.onclose = () => {
    socket = null;
  };

  return socket;
}

function send<T>(
  useLocalhost: boolean,
  payload: Record<string, any>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const ws = ensureSocket(useLocalhost);

    const requestId = randomUUID();

    pending.set(requestId, { resolve, reject });

    ws.send(
      JSON.stringify({
        ...payload,
        requestId,
        cookies, // optional: only needed if you authenticate via cookies manually
      }),
    );
  });
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
