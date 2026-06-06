import type { FSWatcher } from 'chokidar';


export interface DirectoryMonitorCallbacks {
  add?: (filepath: string) => void | Promise<void>;
  change?: (filepath: string) => void | Promise<void>;
  unlink?: (filepath: string) => void | Promise<void>;
  addDir?: (directoryPath: string) => void | Promise<void>;
  unlinkDir?: (directoryPath: string) => void | Promise<void>;
  ready?: () => void | Promise<void>;
  error?: (error: Error) => void | Promise<void>;
}

export interface MonitorHandle {
  id: string;
  stop(): Promise<void>;
}

export interface MonitorInfo {
  id: string;
  directory: string;
  status: "starting" | "running" | "stopped" | "error";
  createdAt: Date;
  startedAt?: Date;
  stoppedAt?: Date;
  lastEventAt?: Date;
  lastEventType?: string;
  eventCount: number;
  lastError?: {
    message: string;
    timestamp: Date;
  };
}

interface MonitorState {
  watcher: FSWatcher;
  info: MonitorInfo;
}