/** Bound concurrent fetch/decode work to avoid loading every GLB at once. */
export class LoadQueue {
  private active = 0;
  private waiting: (() => void)[] = [];
  constructor(private limit = 2) {
    if (!Number.isInteger(limit) || limit < 1)
      throw new Error("Invalid load limit");
  }
  async run<T>(task: () => Promise<T>): Promise<T> {
    await new Promise<void>((resolve) => {
      const start = () => {
        this.active++;
        resolve();
      };
      if (this.active < this.limit) start();
      else this.waiting.push(start);
    });
    try {
      return await task();
    } finally {
      this.active--;
      this.waiting.shift()?.();
    }
  }
}
