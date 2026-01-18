import { Extractor } from '../environment/extractor.js';
import { PersistenceConnector } from './persistence-connector.js';
import { IPersistenceConfig } from './model/persistence-config.interface.js';
import { PoolFactory } from './postgres/factory/postgres-pool-factory.js';
import type { IPool } from './postgres/model/postgres-pool.interface.js';

// TODO: move to postgres lib
export class PersistenceFactory {

    /**
     * Provides a convenient way to instantiate a persistence connector
     * using configuration values from environment variables.
     */
    public static makeConnector(overrides: Partial<IPersistenceConfig> = {}): PersistenceConnector {
        const config = PersistenceFactory.makeConfig(overrides);
        const connectionPool: IPool = new PoolFactory().makePool(config);
        return new PersistenceConnector(connectionPool);
    }

    /**
     * Provides a convenient way to instantiate a persistence
     * configuration using values from environment variables.
     */
    public static makeConfig(overrides: Partial<IPersistenceConfig> = {}): IPersistenceConfig {
        return {
            database: Extractor.extractString('DATABASE_DATABASE'),
            user: Extractor.extractString('DATABASE_USER'),
            password: Extractor.extractString('DATABASE_PASSWORD'),
            host: Extractor.extractString('DATABASE_HOST'),
            port: Extractor.extractNumber('DATABASE_PORT', 5432),
            ssl: Extractor.extractBoolean('DATABASE_SSL_CONNECTION', true),
            // new pool used for each request (should change to not use pools here)
            max: Extractor.extractNumber('DATABASE_MAX_POOL_SIZE', 3),
            // close idle clients after 1 second
            idleTimeoutMillis: Extractor.extractNumber('DATABASE_IDLE_TIMEOUT_MILLIS', 1000),
            // return an error after 1 second if connection could not be established
            connectionTimeoutMillis: Extractor.extractNumber('DATABASE_CONNECTION_TIMEOUT_MILLIS', 1000),
            ...overrides,
        };
    }

}