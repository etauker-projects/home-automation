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
  retries?: number;
  retryDelayMs?: number;
  /** Maximum number of files backed up at the same time (default 4) */
  maxConcurrentBackups?: number;
  logger?: {
    info?: (msg: string) => void;
    error?: (msg: string, err?: any) => void;
  };
}
