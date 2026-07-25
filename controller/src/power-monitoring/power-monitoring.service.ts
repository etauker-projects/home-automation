import { readdir, readFile } from 'fs/promises';
import { resolve } from 'path';
import {
    PowerDataEntry,
    PowerMetric,
    AggregationPeriod,
    PowerDataResponse,
    PowerDataQuery,
} from './power-monitoring.interfaces.js';
import { PowerMonitoringProcessor } from './power-monitoring.processor.js';

/**
 * Service for managing power monitoring data
 */
export class PowerMonitoringService {
    private processor: PowerMonitoringProcessor;

    constructor(
        inboxDir: string,
        private processedDir: string,
        metadataDir: string,
        private debug: boolean = false
    ) {
        this.processor = new PowerMonitoringProcessor(inboxDir, processedDir, metadataDir);
    }

    /**
     * Log debug messages
     */
    private log(message: string, data?: any): void {
        if (this.debug) {
            console.log(`[PowerMonitoring] ${message}`, data !== undefined ? data : '');
        }
    }

    /**
     * Process all CSV files in the inbox directory
     */
    async processInboxFiles(): Promise<void> {
        this.log('Processing inbox files...');
        await this.processor.processAllFiles();
        this.log('Inbox processing complete');
    }

    /**
     * Process a single CSV file
     */
    async processFile(filepath: string): Promise<void> {
        this.log('Processing file:', filepath);
        await this.processor.processFile(filepath);
        this.log('File processing complete');
    }

    /**
     * Get power monitoring data based on query parameters
     */
    async getData(query: PowerDataQuery): Promise<PowerDataResponse> {
        const { metric, year, month, day } = query;
        this.log('Received request for data:', { metric, year, month, day });

        const basepath = resolve(this.processedDir);

        // Determine aggregation period and file pattern based on query
        if (month === undefined) {
            // Monthly aggregation: GET /data/:metric/:year
            return this.getMonthlyData(basepath, metric, year);
        } else if (day === undefined) {
            // Daily aggregation: GET /data/:metric/:year?month=MM
            return this.getDailyData(basepath, metric, year, month);
        } else {
            // Hourly aggregation: GET /data/:metric/:year?month=MM&day=DD
            return this.getHourlyData(basepath, metric, year, month, day);
        }
    }

    /**
     * Get monthly aggregated data
     */
    private async getMonthlyData(
        basepath: string,
        metric: PowerMetric,
        year: string
    ): Promise<PowerDataResponse> {
        const aggregationPeriod: AggregationPeriod = 'monthly';
        const regexString = `${year}\\.${metric}\\.${aggregationPeriod}\\.json`;
        this.log('Monthly regex:', regexString);

        const results = await this.readMatchingFiles(basepath, new RegExp(regexString));
        return { results };
    }

    /**
     * Get daily aggregated data
     */
    private async getDailyData(
        basepath: string,
        metric: PowerMetric,
        year: string,
        month: string
    ): Promise<PowerDataResponse> {
        const aggregationPeriod: AggregationPeriod = 'daily';
        const regexString = `${year}-${month}\\.${metric}\\.${aggregationPeriod}\\.json`;
        this.log('Daily regex:', regexString);

        const results = await this.readMatchingFiles(basepath, new RegExp(regexString));
        return { results };
    }

    /**
     * Get hourly data for a specific day
     */
    private async getHourlyData(
        basepath: string,
        metric: PowerMetric,
        year: string,
        month: string,
        day: string
    ): Promise<PowerDataResponse> {
        const aggregationPeriod: AggregationPeriod = 'hourly';
        const filename = `${year}-${month}-${day}.${metric}.${aggregationPeriod}.json`;
        const filepath = resolve(basepath, filename);
        
        this.log('Hourly file:', filepath);

        try {
            const data = await readFile(filepath, 'utf-8');
            const results = JSON.parse(data) as PowerDataEntry[];
            this.log('Hourly results count:', results.length);
            return { results };
        } catch (error) {
            this.log('Error reading hourly file:', error);
            return { results: [] };
        }
    }

    /**
     * Read all files matching a regex pattern
     */
    private async readMatchingFiles(
        basepath: string,
        regex: RegExp
    ): Promise<PowerDataEntry[]> {
        try {
            const files = await readdir(basepath);
            this.log('Files in directory:', files.length);

            const matchingFiles = files.filter(file => regex.test(file));
            this.log('Matching files:', matchingFiles);

            const promises = matchingFiles.map(async (filepath) => {
                this.log('Reading file:', resolve(basepath, filepath));
                const contents = await readFile(resolve(basepath, filepath), 'utf-8');
                return JSON.parse(contents) as PowerDataEntry[];
            });

            const allResults = await Promise.all(promises);
            const results = allResults.flat();
            this.log('Total results:', results.length);

            return results;
        } catch (error) {
            this.log('Error reading files:', error);
            return [];
        }
    }

    /**
     * Get available years from processed data
     */
    async getAvailableYears(): Promise<string[]> {
        try {
            const files = await readdir(this.processedDir);
            const years = new Set<string>();

            for (const file of files) {
                // Extract year from filename patterns like:
                // 2025.running_cost.monthly.json
                // 2025-10.running_cost.daily.json
                // 2025-10-01.running_cost.hourly.json
                const match = file.match(/^(\d{4})/);
                if (match) {
                    years.add(match[1]);
                }
            }

            return Array.from(years).sort();
        } catch (error) {
            this.log('Error getting available years:', error);
            return [];
        }
    }

    /**
     * Get available months for a given year
     */
    async getAvailableMonths(year: string): Promise<string[]> {
        try {
            const files = await readdir(this.processedDir);
            const months = new Set<string>();

            for (const file of files) {
                // Extract month from filename patterns like:
                // 2025-10.running_cost.daily.json
                // 2025-10-01.running_cost.hourly.json
                const match = file.match(new RegExp(`^${year}-(\\d{2})`));
                if (match) {
                    months.add(match[1]);
                }
            }

            return Array.from(months).sort();
        } catch (error) {
            this.log('Error getting available months:', error);
            return [];
        }
    }

    /**
     * Get available days for a given year and month
     */
    async getAvailableDays(year: string, month: string): Promise<string[]> {
        try {
            const files = await readdir(this.processedDir);
            const days = new Set<string>();

            for (const file of files) {
                // Extract day from filename pattern:
                // 2025-10-01.running_cost.hourly.json
                const match = file.match(new RegExp(`^${year}-${month}-(\\d{2})`));
                if (match) {
                    days.add(match[1]);
                }
            }

            return Array.from(days).sort();
        } catch (error) {
            this.log('Error getting available days:', error);
            return [];
        }
    }

    /**
     * Get available metrics from processed data
     */
    async getAvailableMetrics(): Promise<PowerMetric[]> {
        try {
            const files = await readdir(this.processedDir);
            const metrics = new Set<PowerMetric>();

            for (const file of files) {
                if (file.includes('.running_cost.')) {
                    metrics.add('running_cost');
                } else if (file.includes('.energy_usage.')) {
                    metrics.add('energy_usage');
                } else if (file.includes('.time_in_use.')) {
                    metrics.add('time_in_use');
                }
            }

            return Array.from(metrics);
        } catch (error) {
            this.log('Error getting available metrics:', error);
            return [];
        }
    }
}
