export interface Executor {
  endPromise?: Promise<void>;
  args: string[];
}
