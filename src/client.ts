import axios from "axios";
import { LiveRunMove } from "./types";

var cookies: string | undefined;

export function getCookies(): string | undefined {
  return cookies;
}
export function setCookies(c: string) {
  cookies = c;
}
function getOrigin(useLocalhost: boolean) {
  return useLocalhost ? "http://localhost:3000" : "https://dev-run.onrender.com";
}

export async function addRun(
  useLocalhost: boolean,
  problem: string,
  mode: string,
): Promise<string> {
  return (
    await axios.put(
      getOrigin(useLocalhost) + "/api/run",
      {
        problem,
        category: mode,
      },
      {
        headers: {
          Cookie: cookies,
        },
      },
    )
  ).data.runId;
}

export async function submitRun(useLocalhost: boolean, runId: string) {
  await axios.post(
    getOrigin(useLocalhost) + "/api/run",
    {
      runId,
    },
    {
      headers: {
        Cookie: cookies,
      },
    },
  );
}

export async function addRunMoves(
  useLocalhost: boolean,
  runId: string,
  file: string | null,
  language: string | null,
  moves: LiveRunMove[],
) {
  await axios.post(
    getOrigin(useLocalhost) + "/api/run/move",
    {
      runId,
      file,
      moves,
      language,
    },
    {
      headers: {
        Cookie: cookies,
      },
    },
  );
}
