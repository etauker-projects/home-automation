// import 'mocha';
// import assert from 'assert';
import { describe, it, beforeEach, expect } from 'vitest';

import { PoolFactory } from './postgres-pool-factory.js';
import { IPoolFactory } from '../../model/pool-factory.interface.js';
import { IPersistenceConfig } from '../../model/persistence-config.interface.js';

describe('PoolFactory', () => {

    let config: IPersistenceConfig;
    let factory: IPoolFactory
    beforeEach(() => {
        config = {
            database: 'database',
            user: 'user',
            password: 'password',
            host: 'host',
            port: 1234,
        }
        factory = new PoolFactory();
    })

    describe('makePool', () => {

        it('should throw exception if database is missing', () => {
            (config as any).database = undefined;
            expect(() => factory.makePool(config)).toThrow('Database not set');
        })

        it('should throw exception if user is missing', () => {
            (config as any).user = undefined;
            expect(() => factory.makePool(config)).toThrow('Database user not set');
        })

        it('should throw exception if password is missing', () => {
            (config as any).password = undefined;
            expect(() => factory.makePool(config)).toThrow('Database password not set');
        })

        it('should throw exception if host is missing', () => {
            (config as any).host = undefined;
            expect(() => factory.makePool(config)).toThrow('Database host not set');
        })

        it('should throw exception if port is missing', () => {
            (config as any).port = undefined;
            expect(() => factory.makePool(config)).toThrow('Database port not set');
        })
    })
})
