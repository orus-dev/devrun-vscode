export interface LiveRunMove {
  latency: number;
  cursor: number;
  changes?: {
    from: number;
    to: number;
    insert: string;
  };
}
