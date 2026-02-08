import axios from "axios";

var cookies: string | undefined;

export function getCookies(): string | undefined {
  return cookies;
}
export function setCookies(c: string) {
  cookies = c;
}

export async function addRun(problem: string, mode: string): Promise<string> {
  return (
    await axios.put(
      "http://localhost:3000/api/run",
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

export async function submitRun(runId: string) {
  await axios.post(
    "http://localhost:3000/api/run",
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

export async function addRunMoves() {}
