import path from 'node:path';

/**
 * Directories of the document pipeline.
 *
 * All live under one data root (default `/app/data`, where docker-compose mounts them).
 * Override it with `PIPELINE_DATA_ROOT`, e.g. to point at a temp directory in tests or when running outside docker.
 * Not configurable per directory on purpose: the `DIR_*` variables in `.env` are the *host* paths used by docker-compose.
 */
export interface PipelineDirectoriesConfig {
    /** Printer scans (monitored, files are moved to `consume`) */
    scans: string;
    /** Paperless consume directory (paperless detects and processes files here) */
    consume: string;
    /** Paperless export directory (monitored, files are backed up to `nas`) */
    exports: string;
    /** Document storage on the NAS */
    nas: string;
    /** Manifests, pipeline history and other state */
    config: string;
}

export const PIPELINE_DATA_ROOT_DEFAULT = '/app/data';

export function loadPipelineDirectories(env: NodeJS.ProcessEnv = process.env): PipelineDirectoriesConfig {
    const raw = env.PIPELINE_DATA_ROOT?.trim() || PIPELINE_DATA_ROOT_DEFAULT;
    if (!path.isAbsolute(raw)) {
        throw new Error(`Invalid PIPELINE_DATA_ROOT="${raw}": expected an absolute path`);
    }
    const root = path.resolve(raw);

    return {
        scans: path.join(root, 'scans'),
        consume: path.join(root, 'paperless-consume'),
        exports: path.join(root, 'paperless-exports'),
        nas: path.join(root, 'nas'),
        config: path.join(root, 'config'),
    };
}
