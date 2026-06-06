import { mkdir, rename, copyFile, unlink } from "node:fs/promises";
import { basename, join } from "node:path";

export class FileSystemService {

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
}