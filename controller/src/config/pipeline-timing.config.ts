import cron from 'node-cron';

/**
 * Waiting periods of the document pipeline, configurable via environment variables.
 * Invalid values fail fast at startup rather than silently falling back.
 */
export interface PipelineTimingConfig {
    /** How long a file in the scans directory must stay unchanged before it is moved to paperless */
    scanStabilityMs: number;
    /** How long a file in the exports directory must stay unchanged before it is backed up to the NAS */
    exportStabilityMs: number;
    /** Cron schedule of the paperless export */
    exportCron: string;
    /** Timezone the export cron schedule is evaluated in */
    exportTimezone: string;
    /** How often paperless consume tasks are polled to detect ingestion */
    ingestionPollMs: number;
    /** How long the paperless inbox count is cached */
    inboxCacheMs: number;
    /** How often the pipeline page refreshes */
    uiRefreshMs: number;
}

export const PIPELINE_TIMING_DEFAULTS = {
    SCAN_STABILITY_SECONDS: 180,
    EXPORT_STABILITY_SECONDS: 180,
    PAPERLESS_EXPORT_CRON: '15 * * * *',
    PAPERLESS_EXPORT_TIMEZONE: 'Europe/Dublin',
    PAPERLESS_INGESTION_POLL_SECONDS: 60,
    PAPERLESS_INBOX_CACHE_SECONDS: 60,
    PIPELINE_UI_REFRESH_SECONDS: 5,
} as const;

export function loadPipelineTimingConfig(env: NodeJS.ProcessEnv = process.env): PipelineTimingConfig {
    const d = PIPELINE_TIMING_DEFAULTS;
    return {
        scanStabilityMs: seconds(env, 'SCAN_STABILITY_SECONDS', d.SCAN_STABILITY_SECONDS, 1),
        exportStabilityMs: seconds(env, 'EXPORT_STABILITY_SECONDS', d.EXPORT_STABILITY_SECONDS, 1),
        exportCron: cronPattern(env, 'PAPERLESS_EXPORT_CRON', d.PAPERLESS_EXPORT_CRON),
        exportTimezone: timezone(env, 'PAPERLESS_EXPORT_TIMEZONE', d.PAPERLESS_EXPORT_TIMEZONE),
        ingestionPollMs: seconds(env, 'PAPERLESS_INGESTION_POLL_SECONDS', d.PAPERLESS_INGESTION_POLL_SECONDS, 5),
        inboxCacheMs: seconds(env, 'PAPERLESS_INBOX_CACHE_SECONDS', d.PAPERLESS_INBOX_CACHE_SECONDS, 0),
        uiRefreshMs: seconds(env, 'PIPELINE_UI_REFRESH_SECONDS', d.PIPELINE_UI_REFRESH_SECONDS, 1),
    };
}

export function describePipelineTiming(config: PipelineTimingConfig): string {
    const s = (ms: number) => `${ms / 1000}s`;
    return [
        `scan stability ${s(config.scanStabilityMs)}`,
        `export stability ${s(config.exportStabilityMs)}`,
        `export cron "${config.exportCron}" (${config.exportTimezone})`,
        `ingestion poll ${s(config.ingestionPollMs)}`,
        `inbox cache ${s(config.inboxCacheMs)}`,
        `UI refresh ${s(config.uiRefreshMs)}`,
    ].join(', ');
}

function seconds(env: NodeJS.ProcessEnv, name: string, fallback: number, min: number): number {
    const raw = env[name]?.trim();
    if (!raw) return fallback * 1000;

    const value = Number(raw);
    if (!Number.isFinite(value) || value < min) {
        throw new Error(`Invalid ${name}="${raw}": expected a number of seconds >= ${min}`);
    }
    return Math.round(value * 1000);
}

function cronPattern(env: NodeJS.ProcessEnv, name: string, fallback: string): string {
    const value = env[name]?.trim() || fallback;
    if (!cron.validate(value)) {
        throw new Error(`Invalid ${name}="${value}": not a valid cron expression`);
    }
    return value;
}

function timezone(env: NodeJS.ProcessEnv, name: string, fallback: string): string {
    const value = env[name]?.trim() || fallback;
    try {
        new Intl.DateTimeFormat('en', { timeZone: value });
    } catch {
        throw new Error(`Invalid ${name}="${value}": not a valid IANA timezone`);
    }
    return value;
}
