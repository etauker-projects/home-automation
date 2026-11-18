import { CronService } from '../cron/cron.service.js';
import type { Scheduler, Stoppable } from './document-pipeline.interfaces.js';

/** Production Scheduler: cron jobs via CronService (node-cron), intervals via setInterval. */
export class NodeScheduler implements Scheduler {
    constructor(private readonly cronService: CronService = new CronService()) { }

    public cron(pattern: string, timezone: string, task: () => unknown | Promise<unknown>): Stoppable {
        const scheduled = this.cronService.schedule(pattern, timezone, task);
        return { stop: () => scheduled.stop() };
    }

    public interval(ms: number, task: () => unknown | Promise<unknown>): Stoppable {
        const timer = setInterval(() => {
            Promise.resolve()
                .then(task)
                .catch((err) => console.error('[Scheduler] Interval task failed:', err));
        }, ms);
        return { stop: () => clearInterval(timer) };
    }
}
