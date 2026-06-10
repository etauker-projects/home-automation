/**
 * Semaphore for limiting concurrent operations.
 * Controls how many async operations can run simultaneously.
 */
export class Semaphore {
  private available: number;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {
    this.available = max;
  }

  async acquire<T>(process: () => Promise<T>): Promise<T> {
    // Wait for an available slot
    while (this.available === 0) {
      console.log('Semaphore: no workers available, waiting...');
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.available--;
    console.log('Semaphore: worker acquired, processing...');

    try {
      return await process();
    } finally {
      this.available++;
      console.log('Semaphore: worker finished processing , releasing...');
      // Wake up the next waiter in the queue
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
