export interface LiveRunMove {
  latency: number;
  cursor: number;
  changes?: {
    from: number;
    to: number;
    insert: string;
  };
}

export async function submitRun() {}

export async function addRunMoves() {}
