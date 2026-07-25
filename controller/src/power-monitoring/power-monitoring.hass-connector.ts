import Database from 'better-sqlite3';
import {
    PowerDataEntry,
    PowerMetric,
    HassStatisticsRow,
    HassEntityMeta,
    ValueUnit,
} from './power-monitoring.interfaces.js';
import { PowerMonitoringProcessor } from './power-monitoring.processor.js';

/**
 * Configuration for the HASS SQLite connector
 */
export interface HassDbConfig {
    dbPath: string;
    timezone?: string;          // IANA timezone name, e.g. 'Europe/Dublin'
    metrics?: PowerMetric[];    // Metrics to extract (default: all)
}

/**
 * Reads power statistics directly from a Home Assistant SQLite database
 * and converts them to PowerDataEntry records compatible with the existing
 * PowerMonitoringProcessor pipeline.
 *
 * HASS stores cumulative sums in the statistics table.
 * This connector uses a LAG window function to compute hourly deltas.
 */
export class PowerMonitoringHassConnector {

    private db: Database.Database;
    private timezone: string;
    private metrics: PowerMetric[];

    // SQL: query hourly statistics with per-entity delta computation.
    // We extend the start range by 1 hour so that the first row in the
    // desired window always has a LAG value, then filter that prefix out.
    private static readonly DELTA_QUERY = `
        WITH extended AS (
            SELECT
                s.id,
                sm.statistic_id,
                s.start_ts,
                s.sum,
                sm.unit_of_measurement AS unit
            FROM statistics s
            JOIN statistics_meta sm ON s.metadata_id = sm.id
            WHERE s.start_ts >= @extended_start_ts
              AND s.start_ts < @end_ts
              AND s.sum IS NOT NULL
        ),
        with_delta AS (
            SELECT
                id,
                statistic_id,
                start_ts,
                COALESCE(
                    sum - LAG(sum) OVER (PARTITION BY statistic_id ORDER BY start_ts),
                    0
                ) AS delta,
                unit
            FROM extended
        )
        SELECT * FROM with_delta
        WHERE start_ts >= @start_ts
          AND delta >= 0
        ORDER BY start_ts, statistic_id
    `;

    private static readonly ENTITIES_QUERY = `
        SELECT id, statistic_id, unit_of_measurement AS unit, source
        FROM statistics_meta
        ORDER BY statistic_id
    `;

    constructor(config: HassDbConfig) {
        this.db = new Database(config.dbPath, { readonly: true });
        this.timezone = config.timezone ?? 'Europe/Dublin';
        this.metrics = config.metrics ?? ['running_cost', 'energy_usage', 'time_in_use'];
    }

    /**
     * List all entities available in the HASS statistics_meta table,
     * annotated with parsed metric/object/period where applicable.
     */
    listEntities(): HassEntityMeta[] {
        const rows = this.db.prepare(PowerMonitoringHassConnector.ENTITIES_QUERY).all() as any[];
        return rows.map(row => {
            const parsed = PowerMonitoringProcessor.parseStatisticId(row.statistic_id, this.metrics);
            return {
                id: row.id,
                statistic_id: row.statistic_id,
                unit: row.unit ?? '',
                source: row.source ?? '',
                parsedMetric: parsed.metric,
                parsedObject: parsed.object || undefined,
                parsedPeriod: parsed.period,
            } as HassEntityMeta;
        });
    }

    /**
     * Extract PowerDataEntry records for a given date range.
     *
     * @param startDate - Inclusive start date/time in local timezone (ISO string or Date)
     * @param endDate   - Exclusive end date/time in local timezone (ISO string or Date)
     */
    extractEntries(startDate: Date, endDate: Date): PowerDataEntry[] {
        const startTs   = Math.floor(startDate.getTime() / 1000);
        const endTs     = Math.floor(endDate.getTime() / 1000);
        const extendedStartTs = startTs - 3600; // 1 hour before to feed LAG

        const rows = this.db.prepare(PowerMonitoringHassConnector.DELTA_QUERY).all({
            start_ts:          startTs,
            end_ts:            endTs,
            extended_start_ts: extendedStartTs,
        }) as HassStatisticsRow[];

        const entries: PowerDataEntry[] = [];

        for (const row of rows) {
            // Only process entities matching known power metrics
            const parsed = PowerMonitoringProcessor.parseStatisticId(row.statistic_id, this.metrics);
            if (!parsed.metric || !parsed.object || !parsed.period) {
                continue;
            }

            // Convert UTC unix timestamp to local time parts
            const timeParts = this.formatTimestamp(row.start_ts);

            entries.push({
                id:                 String(row.id),
                value:              this.roundToTwoDecimals(row.delta),
                unit:               this.normalizeUnit(row.unit),
                year:               timeParts.year,
                month:              timeParts.month,
                day:                timeParts.day,
                hour:               timeParts.hour,
                metric:             parsed.metric,
                object:             parsed.object,
                aggregation_period: parsed.period,
            });
        }

        return entries;
    }

    /**
     * Convenience method: extract all entries for a full year.
     */
    extractYear(year: string): PowerDataEntry[] {
        const start = new Date(`${year}-01-01T00:00:00`);
        const end   = new Date(`${parseInt(year) + 1}-01-01T00:00:00`);
        return this.extractEntries(start, end);
    }

    /**
     * Convenience method: extract all entries for a calendar month.
     */
    extractMonth(year: string, month: string): PowerDataEntry[] {
        const paddedMonth = month.padStart(2, '0');
        const start = new Date(`${year}-${paddedMonth}-01T00:00:00`);
        // First day of next month
        const nextMonth = (parseInt(month) % 12) + 1;
        const nextYear  = nextMonth === 1 ? parseInt(year) + 1 : parseInt(year);
        const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00`);
        return this.extractEntries(start, end);
    }

    /**
     * Convenience method: extract all entries for a single day.
     */
    extractDay(year: string, month: string, day: string): PowerDataEntry[] {
        const paddedMonth = month.padStart(2, '0');
        const paddedDay   = day.padStart(2, '0');
        const start = new Date(`${year}-${paddedMonth}-${paddedDay}T00:00:00`);
        const end   = new Date(`${year}-${paddedMonth}-${paddedDay}T23:59:59`);
        end.setTime(end.getTime() + 1000); // exclusive end = next day 00:00
        return this.extractEntries(start, end);
    }

    /**
     * Close the database connection.
     */
    close(): void {
        this.db.close();
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Convert a Unix timestamp (seconds, UTC) to local date/time parts
     * using the configured IANA timezone.
     */
    private formatTimestamp(ts: number): {
        year: string; month: string; day: string; hour: string;
    } {
        const date = new Date(ts * 1000);

        // Use Intl.DateTimeFormat to get parts in the target timezone
        const formatter = new Intl.DateTimeFormat('en', {
            timeZone: this.timezone,
            year:     'numeric',
            month:    '2-digit',
            day:      '2-digit',
            hour:     '2-digit',
            hour12:   false,
        });

        const parts: Record<string, string> = {};
        for (const part of formatter.formatToParts(date)) {
            if (part.type !== 'literal') {
                parts[part.type] = part.value;
            }
        }

        // Intl returns '24' for midnight in some environments; normalise to '00'
        const hour = parts['hour'] === '24' ? '00' : parts['hour'];

        return {
            year:  parts['year'],
            month: parts['month'],
            day:   parts['day'],
            hour,
        };
    }

    /**
     * Normalise HASS unit strings to our ValueUnit type.
     * HASS may return 'EUR', '€', 'kWh', 'h', 'min', etc.
     */
    private normalizeUnit(unit: string): ValueUnit {
        switch (unit?.toLowerCase()) {
            case 'eur':
            case '€':
                return 'cents'; // HASS stores cost in the configured currency; we expose as cents
            case 'kwh':
                return 'kWh';
            case 'h':
            case 'hr':
            case 'hours':
                return 'hours';
            case 'min':
            case 'minutes':
                return 'minutes';
            default:
                return 'cents'; // safe fallback
        }
    }

    /**
     * Round a number to two decimal places.
     */
    private roundToTwoDecimals(value: number): number {
        return Math.round(value * 100) / 100;
    }
}
