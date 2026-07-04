import cron from 'node-cron';

export class CronService {

    private tasks: cron.ScheduledTask[] = [];

    public schedule(cronPattern: string, timezone: string, handler: Function): cron.ScheduledTask {
        const task = cron.schedule(cronPattern, () => {
            console.log('Executing task');
            handler();
        }, { timezone });

        this.tasks.push(task);
        return task;
    }

}