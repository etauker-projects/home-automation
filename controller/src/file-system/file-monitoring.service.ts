import { randomUUID } from 'node:crypto';
import chokidar, { WatchOptions } from 'chokidar';
import type { DirectoryMonitorCallbacks, MonitorHandle, MonitorInfo, MonitorState } from './file-monitoring.interfaces';

export class FileMonitoringService {
    private readonly monitors = new Map<string, MonitorState>();

    constructor(
        private readonly defaultOptions: WatchOptions = {
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 5000,
                pollInterval: 100,
            },
        },
    ) { }

    public monitorDirectory(directory: string, callbacks: DirectoryMonitorCallbacks, options?: WatchOptions): MonitorHandle {
        const id = randomUUID();

        const watcher = chokidar.watch(directory, {
            ...this.defaultOptions,
            ...options,
        });

        const info: MonitorInfo = {
            id,
            directory,
            status: "starting",
            createdAt: new Date(),
            eventCount: 0,
        };

        this.monitors.set(id, {
            watcher,
            info,
        });

        const recordEvent = (eventType: string): void => {
            info.lastEventAt = new Date();
            info.lastEventType = eventType;
            info.eventCount++;
        };

        const recordError = (error: Error): void => {
            info.status = "error";

            info.lastError = {
                message: error.message,
                timestamp: new Date(),
            };
        };

        const safe = <T extends unknown[]>(
            eventType: string,
            handler?: (...args: T) => void | Promise<void>
        ) => async (...args: T): Promise<void> => {
            recordEvent(eventType);

            if (!handler) {
                return;
            }

            try {
                await handler(...args);
            } catch (error) {
                const err = error instanceof Error
                    ? error
                    : new Error(String(error));

                recordError(err);

                // if (callbacks.error) {
                await callbacks.error?.(err);
                // }
            }
        };

        watcher.on("add", safe("add", callbacks.add));
        watcher.on("change", safe("change", callbacks.change));
        watcher.on("unlink", safe("unlink", callbacks.unlink));

        watcher.on("addDir", safe("addDir", callbacks.addDir));
        watcher.on("unlinkDir", safe("unlinkDir", callbacks.unlinkDir));

        watcher.on(
            "ready",
            safe("ready", async () => {
                info.status = "running";
                info.startedAt = new Date();

                await callbacks.ready?.();
            }),
        );

        watcher.on("error", async (error) => {
            recordError(error);

            await callbacks.error?.(error);
        });

        let stopped = false;

        return {
            id,

            stop: async (): Promise<void> => {
                if (stopped) return;

                stopped = true;

                info.status = "stopped";
                info.stoppedAt = new Date();

                this.monitors.delete(id);

                await watcher.close();
            },
        };
    }

    getMonitor(id: string): MonitorInfo | undefined {
        const monitor = this.monitors.get(id);
        if (!monitor) return;
        return structuredClone(monitor.info);
    }

    getActiveMonitors(): MonitorInfo[] {
        return [...this.monitors.values()].map((monitor) =>
            structuredClone(monitor.info),
        );
    }

    async stopMonitor(id: string): Promise<void> {
        const monitor = this.monitors.get(id);
        if (!monitor) return;

        monitor.info.status = "stopped";
        monitor.info.stoppedAt = new Date();

        this.monitors.delete(id);

        await monitor.watcher.close();
    }

    async stopAll(): Promise<void> {
        const monitors = [...this.monitors.values()];

        this.monitors.clear();

        await Promise.all(
            monitors.map(async ({ watcher, info }) => {
                try {
                    info.status = "stopped";
                    info.stoppedAt = new Date();

                    await watcher.close();
                } catch {
                    // Ignore shutdown failures
                }
            }),
        );
    }
}