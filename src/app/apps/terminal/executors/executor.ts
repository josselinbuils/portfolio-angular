import { Deferred } from '@portfolio/platform/deferred';

export interface Executor {
  args: string[];
  releaseDeferred?: Deferred<void>;
  onKill?(): void;
}
