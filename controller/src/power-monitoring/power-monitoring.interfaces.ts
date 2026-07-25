/**
 * Supported metrics for power monitoring
 */
export type PowerMetric = 'running_cost' | 'energy_usage' | 'time_in_use';

/**
 * Aggregation periods for data grouping
 */
export type AggregationPeriod = 'hourly' | 'daily' | 'monthly';

/**
 * Unit of measurement for values
 */
export type ValueUnit = 'cents' | '€' | 'EUR' | 'kWh' | 'hours' | 'minutes';

/**
 * Raw CSV entry from Home Assistant export
 */
export interface RawCsvEntry {
    id: string;
    metadata_id?: string;
    statistic_id: string;
    value: string;
    unit: string;
    start_utc?: string;
    start_ts?: string;
    created_utc: string;
    created_ts?: string;
}

/**
 * Processed power monitoring data entry
 */
export interface PowerDataEntry {
    id: string;
    value: number;
    unit: ValueUnit;
    year: string;
    month: string;
    day: string;
    hour: string;
    type?: string;
    object: string;           // Device identifier (e.g., 'kitchen_kettle_plug')
    metric: PowerMetric;
    aggregation_period: AggregationPeriod;
}

/**
 * Statistics for processed data (metadata)
 */
export interface ProcessingStats {
    descriptions: {
        general: Record<string, string>;
        objects: Record<string, string>;
    };
    general: {
        type: AggregationPeriod;
        year: string;
        month: string;
        day?: string;
        hour?: string;
        intialCount: number;
        finalCount: number;
        entityCount: number;
        objects: Record<string, ObjectStats>;
    };
}

/**
 * Per-object statistics
 */
export interface ObjectStats {
    inputCount: number;
    inputCoverage: number;
    max: number;
    unit: string;
}

/**
 * Processing output structure
 */
export interface ProcessingOutput {
    filename: string;
    data: PowerDataEntry[];
    metadata: ProcessingStats;
}

/**
 * Configuration for CSV parsing
 */
export interface CsvParsingConfig {
    mappings: Record<string, 'number' | 'string' | 'null'>;
    metrics: PowerMetric[];
}

/**
 * API response for power monitoring data
 */
export interface PowerDataResponse {
    results: PowerDataEntry[];
}

/**
 * Query parameters for data API
 */
export interface PowerDataQuery {
    metric: PowerMetric;
    year: string;
    month?: string;
    day?: string;
}

/**
 * Entity metadata from HASS (from /api/states or statistics_meta)
 */
export interface HassEntityMeta {
    id: number;
    statistic_id: string;
    unit: string;
    source: string;
    parsedMetric?: PowerMetric | null;
    parsedObject?: string;
    parsedPeriod?: AggregationPeriod | null;
}

/**
 * Summary of a sync operation from HASS DB
 */
export interface SyncResult {
    entriesExtracted: number;
    filesWritten: number;
    dateRange: { from: string; to: string };
    errors: string[];
}
