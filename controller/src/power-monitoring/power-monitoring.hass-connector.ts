import {
    PowerDataEntry,
    PowerMetric,
    HassEntityMeta,
    ValueUnit,
} from './power-monitoring.interfaces.js';
import { PowerMonitoringProcessor } from './power-monitoring.processor.js';

/**
 * Configuration for the HASS REST API connector.
 * Requires a Long-Lived Access Token generated in Home Assistant
 * (Profile → Security → Long-Lived Access Tokens).
 */
export interface HassApiConfig {
    baseUrl: string;         // e.g. 'http://homeassistant.local:8123'
    token: string;           // Long-Lived Access Token
    timezone?: string;       // IANA timezone name, e.g. 'Europe/Dublin'
    metrics?: PowerMetric[]; // Metrics to extract (default: all)
}

/**
 * Raw statistics record returned by the HASS WebSocket API per statistic_id per period.
 */
interface HassStatisticRecord {
    start: string;           // ISO 8601 (UTC)
    end: string;             // ISO 8601 (UTC)
    change: number | null;   // Delta for the period (what we want)
    sum: number | null;      // Cumulative sum
    mean: number | null;
    min: number | null;
    max: number | null;
    state: number | null;
    last_reset: string | null;
}

/**
 * Reads power statistics from Home Assistant and converts them into
 * PowerDataEntry records compatible with the existing PowerMonitoringProcessor pipeline.
 *
 * Entity discovery  → REST  GET /api/states
 * Statistics query  → WebSocket  recorder/statistics_during_period
 *   (HA does not expose long-term statistics via REST)
 *
 * Requires a Long-Lived Access Token generated in Home Assistant
 * (Profile → Security → Long-Lived Access Tokens).
 */
export class PowerMonitoringHassConnector {

    private baseUrl: string;
    private token: string;
    private timezone: string;
    private metrics: PowerMetric[];

    constructor(config: HassApiConfig) {
        // Normalise base URL (strip trailing slash)
        this.baseUrl = config.baseUrl.replace(/\/+$/, '');
        this.token = config.token;
        this.timezone = config.timezone ?? 'Europe/Dublin';
        this.metrics = config.metrics ?? ['running_cost', 'energy_usage', 'time_in_use'];
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * List sensor entities available in Home Assistant that match known
     * power metrics, annotated with parsed metric/object/period.
     *
     * Uses GET /api/states and filters for sensors matching metric patterns.
     */
    async listEntities(): Promise<HassEntityMeta[]> {
        const url = `${this.baseUrl}/api/states`;
        const response = await fetch(url, { headers: this.headers() });

        if (!response.ok) {
            throw new Error(
                `HASS API error listing entities: ${response.status} ${response.statusText}`
            );
        }

        const states = (await response.json()) as Array<{
            entity_id: string;
            attributes?: { unit_of_measurement?: string };
        }>;

        // Keep only sensor entities whose ID contains one of our tracked metrics
        const matching = states.filter(s =>
            s.entity_id.startsWith('sensor.') &&
            this.metrics.some(m => s.entity_id.includes(m))
        );

        return matching.map((state, idx) => {
            const parsed = PowerMonitoringProcessor.parseStatisticId(
                state.entity_id,
                this.metrics
            );
            return {
                id:           idx,
                statistic_id: state.entity_id,
                unit:         state.attributes?.unit_of_measurement ?? '',
                source:       'api',
                parsedMetric: parsed.metric,
                parsedObject: parsed.object || undefined,
                parsedPeriod: parsed.period,
            } as HassEntityMeta;
        });
    }

    /**
     * Extract PowerDataEntry records for a given date range.
     *
     * Uses the Home Assistant WebSocket API (`recorder/statistics_during_period`)
     * because there is no equivalent REST endpoint for long-term statistics.
     *
     * @param startDate - Inclusive start date/time
     * @param endDate   - Exclusive end date/time
     */
    async extractEntries(startDate: Date, endDate: Date): Promise<PowerDataEntry[]> {
        // Resolve the entity IDs we care about
        const entities = await this.listEntities();
        if (entities.length === 0) {
            console.warn('[HassConnector] No matching entities found — check metric patterns and HASS token permissions.');
            return [];
        }

        const statIds = entities.map(e => e.statistic_id);

        // Fetch statistics via the WebSocket API
        // (HA does not expose a REST endpoint for long-term statistics)
        const data = await this.queryStatisticsViaWebSocket(startDate, endDate, statIds);
        console.log(`[HassConnector] Retrieved statistics for ${Object.keys(data).length} entities.`);

        const entries: PowerDataEntry[] = [];

        for (const [statId, records] of Object.entries(data)) {
            const parsed = PowerMonitoringProcessor.parseStatisticId(statId, this.metrics);
            if (!parsed.metric || !parsed.object || !parsed.period) continue;

            const entity = entities.find(e => e.statistic_id === statId);
            
            for (const record of records) {
                const change = record.change ?? 0;
                if (change < 0) continue; // discard negative deltas (resets / anomalies)
                
                const { unit, value }   = this.normalizeUnit(change, entity?.unit ?? '');
                const timeParts = this.formatTimestamp(new Date(record.start));

                entries.push({
                    id:                 `${statId}-${record.start}`,
                    value:              this.roundToTwoDecimals(value),
                    unit,
                    year:               timeParts.year,
                    month:              timeParts.month,
                    day:                timeParts.day,
                    hour:               timeParts.hour,
                    metric:             parsed.metric,
                    object:             parsed.object,
                    aggregation_period: parsed.period,
                });
            }
        }

        return entries;
    }

    /**
     * Query Home Assistant long-term statistics using the WebSocket API.
     *
     * HA WebSocket protocol:
     *  1. Connect to ws(s)://{host}/api/websocket
     *  2. Server sends {"type":"auth_required"}
     *  3. Client sends {"type":"auth","access_token":"..."}
     *  4. Server sends {"type":"auth_ok"} or {"type":"auth_invalid"}
     *  5. Client sends {"id":N,"type":"recorder/statistics_during_period",...}
     *  6. Server sends {"id":N,"type":"result","success":true,"result":{...}}
     */
    private queryStatisticsViaWebSocket(
        startDate: Date,
        endDate: Date,
        statIds: string[]
    ): Promise<Record<string, HassStatisticRecord[]>> {

        const wsUrl = this.baseUrl
            .replace(/^https:\/\//, 'wss://')
            .replace(/^http:\/\//, 'ws://') + '/api/websocket';

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUrl);
            const queryId = 1;
            let settled = false;

            /** Close the socket and resolve/reject exactly once. */
            const finish = (result: Record<string, HassStatisticRecord[]> | Error): void => {
                if (settled) return;
                settled = true;
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
                if (result instanceof Error) {
                    reject(result);
                } else {
                    resolve(result);
                }
            };

            // Hard timeout — prevents the promise from hanging forever
            const timer = setTimeout(
                () => finish(new Error('[HassConnector] WebSocket statistics query timed out after 30 s')),
                30_000
            );

            ws.addEventListener('error', () => {
                clearTimeout(timer);
                finish(new Error(`[HassConnector] WebSocket connection error (url: ${wsUrl})`));
            });

            ws.addEventListener('message', (event: MessageEvent) => {
                let msg: Record<string, unknown>;
                try {
                    msg = JSON.parse(event.data as string) as Record<string, unknown>;
                } catch {
                    return; // ignore non-JSON frames
                }

                switch (msg['type']) {

                    case 'auth_required':
                        ws.send(JSON.stringify({ type: 'auth', access_token: this.token }));
                        break;

                    case 'auth_ok':
                        // Authenticated — issue the statistics query
                        ws.send(JSON.stringify({
                            id:            queryId,
                            type:          'recorder/statistics_during_period',
                            start_time:    startDate.toISOString(),
                            end_time:      endDate.toISOString(),
                            statistic_ids: statIds,
                            period:        'hour',
                            types:         ['change'], // change, last_reset, max, mean, min, state, or sum
                        }));
                        break;

                    case 'auth_invalid':
                        clearTimeout(timer);
                        finish(new Error(
                            `[HassConnector] WebSocket auth rejected: ${msg['message'] ?? 'unknown reason'}`
                        ));
                        break;

                    case 'result':
                        if (msg['id'] !== queryId) break; // belongs to a different command
                        clearTimeout(timer);
                        if (msg['success'] === true) {
                            finish(msg['result'] as Record<string, HassStatisticRecord[]>);
                        } else {
                            finish(new Error(
                                `[HassConnector] WebSocket query failed: ${JSON.stringify(msg['error'])}`
                            ));
                        }
                        break;
                }
            });
        });
    }

    /**
     * Convenience method: extract all entries for a full year.
     */
    async extractYear(year: string): Promise<PowerDataEntry[]> {
        const start = new Date(`${year}-01-01T00:00:00`);
        const end   = new Date(`${parseInt(year) + 1}-01-01T00:00:00`);
        return this.extractEntries(start, end);
    }

    /**
     * Convenience method: extract all entries for a calendar month.
     */
    async extractMonth(year: string, month: string): Promise<PowerDataEntry[]> {
        const paddedMonth = month.padStart(2, '0');
        const start = new Date(`${year}-${paddedMonth}-01T00:00:00`);
        const nextMonth = (parseInt(month) % 12) + 1;
        const nextYear  = nextMonth === 1 ? parseInt(year) + 1 : parseInt(year);
        const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00`);
        return this.extractEntries(start, end);
    }

    /**
     * Convenience method: extract all entries for a single day.
     */
    async extractDay(year: string, month: string, day: string): Promise<PowerDataEntry[]> {
        const paddedMonth = month.padStart(2, '0');
        const paddedDay   = day.padStart(2, '0');
        const start = new Date(`${year}-${paddedMonth}-${paddedDay}T00:00:00`);
        const end   = new Date(`${year}-${paddedMonth}-${paddedDay}T23:59:59`);
        end.setTime(end.getTime() + 1000); // exclusive end = next day 00:00
        return this.extractEntries(start, end);
    }

    /**
     * No-op: kept for interface compatibility (no database connection to close).
     */
    close(): void {
        // Nothing to close — HTTP connections are stateless
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Build the Authorization header for all HASS API requests.
     */
    private headers(): Record<string, string> {
        return {
            Authorization:  `Bearer ${this.token}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Convert a Date to local date/time parts using the configured IANA timezone.
     */
    private formatTimestamp(date: Date): {
        year: string; month: string; day: string; hour: string;
    } {
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
     */
    private normalizeUnit(value: number, unit: string): { unit: ValueUnit; value: number } {
        switch (unit?.toLowerCase()) {
            case 'eur':
            case '€':
                return { unit: 'cents', value: value * 100 };
            case 'kwh':
                return { unit: 'kWh', value };
            case 'h':
            case 'hr':
            case 'hours':
                return { unit: 'hours', value };
            case 'min':
            case 'minutes':
                return { unit: 'minutes', value };
            default:
                return { unit: 'unknown', value };
        }
    }

    /**
     * Round a number to two decimal places.
     */
    private roundToTwoDecimals(value: number): number {
        return Math.round(value * 100) / 100;
    }
}
