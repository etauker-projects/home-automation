import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import moment from 'moment';
import {
    PowerDataEntry,
    PowerMetric,
    AggregationPeriod,
    ProcessingOutput,
    ProcessingStats,
    CsvParsingConfig,
} from './power-monitoring.interfaces.js';

/**
 * Processor for converting Home Assistant CSV exports to JSON format
 */
export class PowerMonitoringProcessor {
    private config: CsvParsingConfig = {
        mappings: {
            // Remove unnecessary fields
            metadata_id: 'null',
            start_utc: 'null',
            start_ts: 'null',
            created_ts: 'null',

            // Numeric values
            value: 'number',

            // String values
            id: 'string',
            statistic_id: 'string',
            unit: 'string',
            created_utc: 'string',
            year: 'string',
            month: 'string',
            day: 'string',
            hour: 'string',
            minute: 'string',
            type: 'string',
            object: 'string',
            aggregation_period: 'string',
        },
        metrics: ['running_cost', 'energy_usage', 'time_in_use'],
    };

    constructor(
        private inboxDir: string,
        private processedDir: string,
        private metadataDir: string
    ) {}

    /**
     * Process all CSV files in the inbox directory
     */
    async processAllFiles(): Promise<void> {
        const files = readdirSync(this.inboxDir).filter(f => f.endsWith('.csv'));
        
        for (const file of files) {
            const filepath = resolve(this.inboxDir, file);
            await this.processFile(filepath);
        }
    }

    /**
     * Process a single CSV file
     */
    async processFile(filepath: string): Promise<ProcessingOutput[]> {
        const csv = readFileSync(filepath, 'utf-8');
        const entries = this.parseCsv(csv);

        if (entries.length === 0) {
            console.warn(`No valid entries in file: ${filepath}`);
            return [];
        }

        const inputFilename = basename(filepath).replace('.csv', '');
        return this.processEntries(entries, inputFilename);
    }

    /**
     * Process a set of already-parsed PowerDataEntry records.
     * Called by processFile() (after CSV parsing) and by the HASS connector.
     * Groups entries by year-month, produces hourly/daily/monthly JSON files,
     * and writes a metadata file labelled by sourceLabel.
     */
    async processEntries(entries: PowerDataEntry[], sourceLabel: string): Promise<ProcessingOutput[]> {
        if (entries.length === 0) {
            console.warn(`No entries to process for source: ${sourceLabel}`);
            return [];
        }

        // Group by year-month to handle data spanning multiple months
        const monthMap = new Map<string, PowerDataEntry[]>();
        for (const entry of entries) {
            const key = `${entry.year}-${entry.month}`;
            if (!monthMap.has(key)) monthMap.set(key, []);
            monthMap.get(key)!.push(entry);
        }

        const allOutputs: ProcessingOutput[] = [];

        for (const [, monthEntries] of monthMap) {
            const first = monthEntries[0];
            const year = first.year;
            const month = first.month;

            const days  = [...new Set(monthEntries.map(e => e.day))].sort();
            const hours = [...new Set(monthEntries.map(e => e.hour))].sort();

            const outputs: ProcessingOutput[] = [
                this.processMonthlyEntries(year, month, monthEntries),
                ...days.flatMap(day => [
                    this.processDailyEntries(year, month, day, monthEntries),
                    ...hours.flatMap(hour =>
                        this.processHourlyEntries(year, month, day, hour, monthEntries)
                    ),
                ]),
            ];

            allOutputs.push(...outputs);
        }

        // Write processed JSON files
        const metadataSummary: Array<{ filename: string; metadata: ProcessingStats['general'] }> = [];

        for (const output of allOutputs) {
            if (output.data.length > 0) {
                const outputPath = resolve(this.processedDir, `${output.filename}.json`);
                writeFileSync(outputPath, JSON.stringify(output.data), 'utf-8');
            }
            metadataSummary.push({ filename: output.filename, metadata: output.metadata.general });
        }

        // Write metadata file
        const metadataPath = resolve(this.metadataDir, `${sourceLabel}.json`);
        writeFileSync(metadataPath, JSON.stringify(metadataSummary), 'utf-8');

        return allOutputs;
    }

    /**
     * Parse CSV content into PowerDataEntry array
     */
    private parseCsv(csv: string): PowerDataEntry[] {
        const lines = csv.split('\n').filter(line => line.trim().length > 0);
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const cols = line.split(',');
            const entry: Record<string, any> = {};

            headers.forEach((header, index) => {
                const value = this.parseValue(header, cols[index]);
                if (value !== null && value !== undefined) {
                    entry[header] = value;
                }
            });

            // Parse timestamp and extract date parts
            const timestamp = moment(entry['created_utc'])
                .startOf('minute')
                .subtract(1, 'millisecond');

            if (!timestamp.isValid()) {
                console.warn('Invalid timestamp', entry);
                return null;
            }

            entry['year'] = timestamp.format('YYYY');
            entry['month'] = timestamp.format('MM');
            entry['day'] = timestamp.format('DD');
            entry['hour'] = timestamp.format('HH');

            // Parse statistic_id to extract metric, object, and aggregation_period
            const entityId = entry['statistic_id'] || '';
            entry['metric'] = this.extractMetric(entityId);
            entry['object'] = this.extractObject(entityId, entry['metric']);
            entry['aggregation_period'] = this.extractAggregationPeriod(entityId, entry['metric']);

            if (!entry['metric'] || !entry['object'] || !entry['aggregation_period']) {
                console.warn('Could not fully parse statistic_id', entry);
                return null;
            }

            // Clean up
            delete entry['statistic_id'];
            delete entry['created_utc'];

            return entry as PowerDataEntry;
        }).filter((entry): entry is PowerDataEntry => entry !== null);
    }

    /**
     * Parse a single value based on its type mapping
     */
    private parseValue(key: string, value: string): string | number | null {
        const type = this.config.mappings[key];
        if (type === 'number') {
            return parseFloat(value);
        } else if (type === 'null') {
            return null;
        }
        return value?.trim();
    }

    /**
     * Parse a statistic_id string into its component parts.
     * Shared by both the CSV processor and the HASS DB connector.
     *
     * Example: "sensor.kitchen_kettle_plug_running_cost_hourly"
     *   → { metric: 'running_cost', object: 'kitchen_kettle_plug', period: 'hourly' }
     */
    public static parseStatisticId(
        entityId: string,
        metrics: PowerMetric[] = ['running_cost', 'energy_usage', 'time_in_use']
    ): { metric: PowerMetric | null; object: string; period: AggregationPeriod | null } {
        let metric: PowerMetric | null = null;
        for (const m of metrics) {
            if (entityId.includes(m)) {
                metric = m;
                break;
            }
        }

        if (!metric) return { metric: null, object: '', period: null };

        const prefix = entityId.split('.')[0];
        const metricIndex = entityId.indexOf(metric);
        const object = entityId.substring(prefix.length + 1, metricIndex - 1);

        const suffix = entityId.substring(metricIndex + metric.length + 1);
        const period: AggregationPeriod | null =
            suffix === 'hourly' || suffix === 'daily' || suffix === 'monthly' ? suffix : null;

        return { metric, object, period };
    }

    /**
     * Extract metric from entity ID
     */
    private extractMetric(entityId: string): PowerMetric | null {
        return PowerMonitoringProcessor.parseStatisticId(entityId, this.config.metrics).metric;
    }

    /**
     * Extract object (device) name from entity ID
     */
    private extractObject(entityId: string, _metric: string | null): string {
        return PowerMonitoringProcessor.parseStatisticId(entityId, this.config.metrics).object;
    }

    /**
     * Extract aggregation period from entity ID
     */
    private extractAggregationPeriod(entityId: string, _metric: string | null): AggregationPeriod | null {
        return PowerMonitoringProcessor.parseStatisticId(entityId, this.config.metrics).period;
    }

    /**
     * Group entries by a key
     */
    private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
        return array.reduce((result, item) => {
            const groupKey = String(item[key]);
            if (!result[groupKey]) {
                result[groupKey] = [];
            }
            result[groupKey].push(item);
            return result;
        }, {} as Record<string, T[]>);
    }

    /**
     * Find entry with largest value (with tie-breaker)
     */
    private findLargestValueEntry(entries: PowerDataEntry[]): PowerDataEntry {
        return entries.reduce((max, current) => {
            if (current.value === max.value) {
                return current.id.localeCompare(max.id) ? max : current;
            }
            return current.value > max.value ? current : max;
        }, entries[0]);
    }

    /**
     * Process monthly entries
     */
    private processMonthlyEntries(year: string, month: string, entries: PowerDataEntry[]): ProcessingOutput {
        const filtered = entries.filter(e => 
            e.aggregation_period === 'monthly' &&
            e.year === year &&
            e.month === month
        );

        const lastDayOfMonth = moment(`${year}-${month}`, 'YYYY-MM').endOf('month').format('DD');
        const daysInMonth = parseInt(lastDayOfMonth, 10);

        const stats = this.createStats('monthly', year, month);
        stats.general.intialCount = filtered.length;

        const grouped = this.groupBy(filtered, 'object');
        
        Object.entries(grouped).forEach(([key, group]) => {
            stats.general.objects[key] = {
                inputCount: group.length,
                inputCoverage: group.length / 24 / daysInMonth,
                max: 0,
                unit: '?',
            };
        });

        const results = Object.values(grouped).map(entries => this.findLargestValueEntry(entries));
        
        results.forEach(entry => {
            stats.general.objects[entry.object].max = entry.value;
            stats.general.objects[entry.object].unit = entry.unit;
        });

        stats.general.finalCount = results.length;
        stats.general.entityCount = Object.keys(grouped).length;

        const entry = results[0];
        const filename = entry ? `${entry.year}.${entry.metric}.${entry.aggregation_period}` : '';
        
        return { filename, data: results, metadata: stats };
    }

    /**
     * Process daily entries
     */
    private processDailyEntries(year: string, month: string, day: string, entries: PowerDataEntry[]): ProcessingOutput {
        const filtered = entries.filter(e =>
            e.aggregation_period === 'daily' &&
            e.year === year &&
            e.month === month &&
            e.day === day
        );

        const stats = this.createStats('daily', year, month, day);
        stats.general.intialCount = filtered.length;

        const grouped = this.groupBy(filtered, 'object');

        Object.entries(grouped).forEach(([key, group]) => {
            stats.general.objects[key] = {
                inputCount: group.length,
                inputCoverage: group.length / 24,
                max: 0,
                unit: '?',
            };
        });

        const results = Object.values(grouped).map(entries => this.findLargestValueEntry(entries));

        results.forEach(entry => {
            stats.general.objects[entry.object].max = entry.value;
            stats.general.objects[entry.object].unit = entry.unit;
        });

        stats.general.finalCount = results.length;
        stats.general.entityCount = Object.keys(grouped).length;

        const entry = results[0];
        const filename = entry ? `${entry.year}-${entry.month}.${entry.metric}.${entry.aggregation_period}` : '';

        return { filename, data: results, metadata: stats };
    }

    /**
     * Process hourly entries
     */
    private processHourlyEntries(year: string, month: string, day: string, hour: string, entries: PowerDataEntry[]): ProcessingOutput {
        const filtered = entries.filter(e =>
            e.aggregation_period === 'hourly' &&
            e.year === year &&
            e.month === month &&
            e.day === day
        );

        const stats = this.createStats('hourly', year, month, day, hour);
        stats.general.intialCount = filtered.length;

        const grouped = this.groupBy(filtered, 'object');

        Object.entries(grouped).forEach(([key, group]) => {
            stats.general.objects[key] = {
                inputCount: group.length,
                inputCoverage: group.length,
                max: 0,
                unit: '?',
            };
        });

        const results = Object.values(grouped).flat();

        results.forEach(entry => {
            stats.general.objects[entry.object].max += entry.value;
            stats.general.objects[entry.object].unit = entry.unit;
        });

        stats.general.finalCount = results.length;
        stats.general.entityCount = Object.keys(grouped).length;

        const entry = results[0];
        const filename = entry ? `${entry.year}-${entry.month}-${entry.day}.${entry.metric}.${entry.aggregation_period}` : '';

        return { filename, data: results, metadata: stats };
    }

    /**
     * Create statistics object with descriptions
     */
    private createStats(
        type: AggregationPeriod,
        year: string,
        month: string,
        day?: string,
        hour?: string
    ): ProcessingStats {
        return {
            descriptions: {
                general: {
                    intialCount: `Number of ${type} entries for the given ${type === 'hourly' ? 'hour' : type === 'daily' ? 'day' : 'month'} (before processing)`,
                    finalCount: `Number of ${type} entries in output dataset`,
                    entityCount: 'Number of distinct objects in the output dataset',
                },
                objects: {
                    inputCount: `Number of ${type} entries per object before processing`,
                    inputCoverage: `Number of entries per object in input dataset divided by expected maximum`,
                    max: `Max value per object for the ${type === 'hourly' ? 'hour' : type === 'daily' ? 'day' : 'month'}`,
                    unit: 'Unit of measurement of the value',
                },
            },
            general: {
                type,
                year,
                month,
                day,
                hour,
                intialCount: 0,
                finalCount: 0,
                entityCount: 0,
                objects: {},
            },
        };
    }
}
