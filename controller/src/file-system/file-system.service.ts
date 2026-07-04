import { mkdir, rename, copyFile, unlink, access, readdir, rmdir, stat, writeFile } from "node:fs/promises";
import path, { basename, join, dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";

export interface FileSystemLogger {
    info?: (message: string) => void;
    error?: (message: string, error?: any) => void;
}

export class FileSystemService {

    constructor(private readonly logger?: FileSystemLogger) { }

    // -------------------------
    // FILE OPERATIONS
    // -------------------------

    public async moveFile(sourcePath: string, targetDirectory: string): Promise<string> {
        await mkdir(targetDirectory, { recursive: true });
        const destinationPath = join(targetDirectory, basename(sourcePath));

        try {
            await rename(sourcePath, destinationPath);
        } catch (err: any) {
            // EXDEV occurs if source and destination are of different devices / partitions
            if (err.code !== "EXDEV") {
                throw err;
            }

            await copyFile(sourcePath, destinationPath);
            await unlink(sourcePath);
        }

        return destinationPath;
    }

    /**
     * Safely copy a file, handling cross-filesystem operations.
     * Tries fast copyFile first, falls back to stream-based copy for cross-device operations.
     */
    public async safeCopy(source: string, dest: string): Promise<void> {
        try {
            // Try fast copyFile first (uses copy_file_range syscall)
            await copyFile(source, dest);
        } catch (err: any) {
            // EPERM / EXDEV indicate cross-device issues
            if (err?.code === 'EPERM' || err?.code === 'EXDEV') {
                // Use stream-based copy for cross-filesystem operations
                const { pipeline } = await import('node:stream/promises');
                const readStream = createReadStream(source);
                const writeStream = createWriteStream(dest);
                await pipeline(readStream, writeStream);
            } else {
                throw err;
            }
        }
    }

    /**
     * Safely delete a file, ignoring "file not found" errors.
     */
    public async safeDelete(filePath: string): Promise<void> {
        try {
            await unlink(filePath);
        } catch (e: any) {
            // ENOENT: file doesn't exist
            if (e?.code !== "ENOENT") throw e;
        }
    }

    /**
     * Get the relative path between two directories, ensuring it's not outside the allowed bounds.
     */
    public getNestedRelativePath(outer: string, inner: string): string {
        const relativePath = path.relative(outer, inner);

        if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
            throw new Error(`File / directory {${inner}) outside allowed bounds (${outer})`);
        }

        return relativePath;
    }
    // -------------------------
    // FILE VERIFICATION
    // -------------------------

    /**
     * Calculate SHA256 hash of a file.
     */
    public async sha256(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = createHash("sha256");
            const stream = createReadStream(filePath);

            stream.on("data", (chunk) => hash.update(chunk));
            stream.on("end", () => resolve(hash.digest("hex")));
            stream.on("error", reject);
        });
    }

    /**
     * Verify that two files match (size and hash).
     */
    public async verify(source: string, destination: string): Promise<void> {
        const [src, dst] = await Promise.all([stat(source), stat(destination)]);

        if (src.size !== dst.size) {
            throw new Error(`Size mismatch (${src.size} != ${dst.size})`);
        }

        const [srcHash, dstHash] = await Promise.all([
            this.sha256(source),
            this.sha256(destination),
        ]);

        if (srcHash !== dstHash) {
            throw new Error("SHA256 mismatch");
        }
    }

    // -------------------------
    // DIRECTORY CLEANUP
    // -------------------------

    /**
     * Recursively clean up empty directories starting from the given directory.
     * This is useful after moving/deleting files to remove leftover empty folder structures.
     *
     * Cleans in two phases:
     * 1. Downward: Removes empty subdirectories recursively
     * 2. Upward: Walks up to root, removing newly-empty parent directories
     *
     * @param startDir - The directory to start cleaning from (works up towards root)
     * @param rootDir - The root directory to stop at (won't delete this or go above it)
     * @returns Promise that resolves when cleanup is complete
     */
    public async cleanupEmptyDirectories(startDir: string, rootDir: string): Promise<void> {
        // Validate that the directory is within root
        this.getNestedRelativePath(rootDir, startDir);

        this.logger?.info?.(`Cleaning up empty directories starting from: ${startDir}`);

        // Phase 1: Clean downward (remove empty subdirectories)
        await this.removeEmptyChildDirectories(startDir, rootDir);

        // Phase 2: Clean upward (remove newly-empty parent directories)
        await this.cleanupEmptyParentDirectories(startDir, rootDir);

        this.logger?.info?.(`Empty directory cleanup complete`);
    }

    /**
     * Walk upward from a directory to root, removing empty parent directories.
     * Stops when it reaches root or encounters a non-empty directory.
     */
    private async cleanupEmptyParentDirectories(startDir: string, rootDir: string): Promise<void> {
        const resolvedRoot = resolve(rootDir);
        let currentDir = resolve(startDir);

        // Walk upward until we reach root
        while (currentDir !== resolvedRoot) {
            // Check if current directory exists
            try {
                await access(currentDir);
            } catch {
                // Directory doesn't exist anymore (already removed), move to parent
                currentDir = dirname(currentDir);
                continue;
            }

            // Check if directory is empty
            const entries = await readdir(currentDir, { withFileTypes: true });

            // Filter out lock and temp files
            const relevantEntries = entries.filter(entry =>
                !entry.name.endsWith('.lock') && !entry.name.endsWith('.part')
            );

            if (relevantEntries.length === 0) {
                // Directory is empty, remove it
                this.logger?.info?.(`Removing empty parent directory: ${currentDir}`);
                try {
                    await rmdir(currentDir);
                } catch (err: any) {
                    // If removal fails, log and stop walking upward
                    this.logger?.error?.(`Failed to remove directory ${currentDir}`, err);
                    break;
                }
            } else {
                // Directory is not empty, stop walking upward
                break;
            }

            // Move to parent directory
            currentDir = dirname(currentDir);
        }
    }

    /**
     * Recursively remove empty directories, ignoring lock and temp files.
     */
    private async removeEmptyChildDirectories(dir: string, rootDir: string): Promise<boolean> {
        // Check if directory exists
        try {
            await access(dir);
        } catch {
            // Directory doesn't exist, nothing to clean
            return true;
        }

        const entries = await readdir(dir, { withFileTypes: true });

        let empty = true;

        for (const entry of entries) {
            const full = join(dir, entry.name);

            if (entry.isDirectory()) {
                const childEmpty = await this.removeEmptyChildDirectories(full, rootDir);
                if (!childEmpty) empty = false;
            } else {
                // Ignore lock files when determining if directory is empty
                if (!entry.name.endsWith('.lock') && !entry.name.endsWith('.part')) {
                    empty = false;
                }
            }
        }

        if (empty && dir !== rootDir) {
            this.logger?.info?.(`Removing empty directory: ${dir}`);
            await rmdir(dir);
        }

        return empty;
    }

    // -------------------------
    // FILE LOCKING
    // -------------------------

    /**
     * Acquire an exclusive lock file. Throws if lock already exists and is not stale.
     */
    public async acquireFileLock(lockPath: string): Promise<void> {
        try {
            await writeFile(lockPath, String(process.pid), { flag: "wx" });
        } catch (err: any) {
            // Check if lock file already exists
            if (err?.code === "EEXIST") {
                // Check if the lock is stale (process no longer running)
                const isStale = await this.isLockStale(lockPath);
                if (isStale) {
                    // Remove stale lock and try again
                    await this.safeDelete(lockPath);
                    await writeFile(lockPath, String(process.pid), { flag: "wx" });
                    console.log(`Removed stale lock and acquired: ${lockPath}`);
                    return;
                }
                throw new Error(`File already locked: ${lockPath}`);
            }
            // Any other error (e.g., permission issues) - rethrow with context
            throw new Error(`Failed to acquire lock at ${lockPath}: ${err.message}`);
        }
    }

    /**
     * Release a lock file.
     */
    public async releaseFileLock(lockPath: string): Promise<void> {
        await this.safeDelete(lockPath);
    }

    /**
     * Check if a lock file is stale (the process that created it is no longer running).
     * This prevents orphaned locks from blocking operations after crashes.
     */
    public async isLockStale(lockPath: string): Promise<boolean> {
        try {
            const pidStr = await import("node:fs/promises").then((fs) =>
                fs.readFile(lockPath, "utf-8")
            );
            const pid = parseInt(pidStr.trim(), 10);

            if (isNaN(pid)) {
                // Invalid PID in lock file - consider it stale
                return true;
            }

            // Check if process is still running
            // On Unix, kill(pid, 0) checks if process exists without actually killing it
            try {
                process.kill(pid, 0);
                return false; // Process exists, lock is valid
            } catch (err: any) {
                // ESRCH = no such process, lock is stale
                // EPERM = process exists but we don't have permission to signal it
                return err.code === "ESRCH";
            }
        } catch {
            // Can't read lock file - consider it stale
            return true;
        }
    }

    // -------------------------
    // RETRY LOGIC
    // -------------------------

    /**
     * Retry a function with exponential backoff.
     */
    public async retry<T>(
        fn: () => Promise<T>,
        retries: number = 3,
        retryDelayMs: number = 2000
    ): Promise<T> {
        let lastErr: any;

        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (err) {
                lastErr = err;
                await new Promise((r) => setTimeout(r, retryDelayMs * (i + 1)));
            }
        }

        throw lastErr;
    }
}
