import { Level } from './level.enum.js';
import { Config } from './config.interface.js';
import { Format } from './format.type.js';
import { LogService } from './log.service.js';
import { Extractor } from '../environment/extractor.js';

export class LogFactory {

    /**
     * Provides a convenient way to instantiate a logging service
     * using configuration values from environment variables.
     */
    public static makeService(overrides: Partial<Config> = {}): LogService {
        const config = LogFactory.makeConfig(overrides);
        return new LogService(config);
    }

    /**
     * Provides a convenient way to instantiate a logging
     * configuration using values from environment variables.
     */
    public static makeConfig(overrides: Partial<Config> = {}): Config {
        const level: string = Extractor.extractEnum('LOGGER_LOG_LEVEL', Object.keys(Level), Level.ALL.toString());
        const format: string = Extractor.extractEnum('LOGGER_OUTPUT_FORMAT', [ 'JSON', 'BASIC', 'GROUP' ], 'GROUP');

        return {
            coloursEnabled: Extractor.extractBoolean('LOGGER_COLOURS_ENABLED', true),
            logLevel: Level[level as keyof typeof Level],
            outputFormat: format as Format,
            ...overrides,
        };
    }

}