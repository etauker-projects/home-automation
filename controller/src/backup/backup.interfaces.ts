export interface BackupResult {
  source: string;
  destination: string;
  bytes: number;
  sha256: string;
  skipped?: boolean;
}

export interface BackupDirectoryResult {
  filesProcessed: number;
  filesSkipped: number;
  filesFailed: number;
  bytesCopied: number;
  results: BackupResult[];
  failures: Array<{ file: string; error: Error }>;
}

export interface BackupOptions {
  concurrency?: number;
  retries?: number;
  retryDelayMs?: number;
  lockFileName?: string;
  maxConcurrentBackups?: number;
  logger?: {
    info?: (msg: string) => void;
    error?: (msg: string, err?: any) => void;
  };
}
