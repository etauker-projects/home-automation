import cron from 'node-cron';

export class CronService {

    private tasks: cron.ScheduledTask[] = [];

    public schedule(cronPattern: string, timezone: string, handler: () => unknown | Promise<unknown>): cron.ScheduledTask {
        const task = cron.schedule(cronPattern, () => {
            console.log('Executing task');
            // a rejected async handler must not become an unhandled rejection
            Promise.resolve()
                .then(handler)
                .catch((err) => console.error('[Cron] Task failed:', err));
        }, { timezone });

        this.tasks.push(task);
        return task;
    }

}
