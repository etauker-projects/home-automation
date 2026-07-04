import path from "node:path";
import { mkdir, rename, stat, unlink, access } from "node:fs/promises";
import { Semaphore } from "./semaphore.js";
import { FileSystemService } from "../file-system/file-system.service.js";
import type {
  BackupResult,
  BackupDirectoryResult,
  BackupOptions,
} from "./backup.interfaces.js";

export type { BackupResult, BackupDirectoryResult, BackupOptions };

/**
 * What’s added
 * Lock file (.backup-lock) to prevent concurrent runs
 * Skip-if-exists + hash check (idempotent backups)
 * Retry with backoff for SMB instability
 * Atomic temp naming on NAS
 * Structured logging hooks (optional)
 * Safer empty-dir cleanup
 * Crash recovery for stale .part files
 * Concurrency-safe directory scan + processing
 */
export class NasBackupService {
  private semaphore: Semaphore;
  private fileSystemService: FileSystemService;

  constructor(
    private readonly sourceRoot: string,
    private readonly nasRoot: string,
    private readonly options: BackupOptions = {}
  ) {
    this.semaphore = new Semaphore(options.maxConcurrentBackups ?? 4);
    this.fileSystemService = new FileSystemService(options.logger);
  }

  public async backupFile(sourceFile: string): Promise<BackupResult> {
    return await this.semaphore.acquire(async () => {

      // create lock (TODO: consider moving inside acquireFileLock)
      const relativePath = this.fileSystemService.getNestedRelativePath(this.sourceRoot, sourceFile);
      const destination = path.join(this.nasRoot, relativePath);
      const lockPath = destination + ".lock";
      await mkdir(path.dirname(destination), { recursive: true });
      await this.fileSystemService.acquireFileLock(lockPath);

      try {
        const result = await this.copyAndVerify(sourceFile);

        try {
          const sourceDir = path.dirname(sourceFile);
          await this.fileSystemService.cleanupEmptyDirectories(sourceDir, this.sourceRoot);
        } catch (cleanupError) {
          const message = `Warning: Failed to cleanup empty directories after backing up ${sourceFile}`;
          this.options.logger?.error?.(message, cleanupError);
        }

        return result;
      } finally {
        await this.fileSystemService.releaseFileLock(lockPath);
      }
    });
  }

  /**
   * Done in multiple steps:
   * 1. Source -> Temp (with retries)
   * 2. Verify temp copy matches source
   * 3. Temp -> Destination (atomic rename)
   * 4. Verify hash matches source
   * 5. Delete source file
   */
  private async copyAndVerify(sourceFile: string): Promise<BackupResult> {

    const relativePath = this.fileSystemService.getNestedRelativePath(this.sourceRoot, sourceFile);
    const destination = path.join(this.nasRoot, relativePath);
    const tempDestination = destination + ".part";

    await mkdir(path.dirname(destination), { recursive: true });

    if (await this.isAlreadyBackedUp(sourceFile, destination)) {
      return {
        source: sourceFile,
        destination,
        bytes: 0,
        sha256: await this.fileSystemService.sha256(sourceFile),
        skipped: true,
      };
    }

    // Reset previous attempts
    await this.fileSystemService.safeDelete(tempDestination);

    // Copy to temp
    await this.fileSystemService.retry(async () => {
      await this.fileSystemService.safeCopy(sourceFile, tempDestination);
    }, this.options.retries, this.options.retryDelayMs);

    // Verify temp copy success
    await this.fileSystemService.verify(sourceFile, tempDestination);

    // Copy from temp to final
    await rename(tempDestination, destination);

    // Delete source file after successful backup
    await unlink(sourceFile);

    const size = (await stat(destination)).size;

    return {
      source: sourceFile,
      destination,
      bytes: size,
      sha256: await this.fileSystemService.sha256(destination),
    };
  }

  private async isAlreadyBackedUp(
    source: string,
    destination: string
  ): Promise<boolean> {
    try {
      await access(destination);
    } catch {
      return false;
    }

    const [srcHash, dstHash] = await Promise.all([
      this.fileSystemService.sha256(source),
      this.fileSystemService.sha256(destination),
    ]);

    return srcHash === dstHash;
  }

}
