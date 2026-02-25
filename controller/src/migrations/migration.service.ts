// /* eslint-disable no-process-env */

// import url from 'url';
// import path from 'path';

// import {
//     IPersistenceConfig,
//     PersistenceConnector,
// } from '../persistence/persistence.module.js';

// import type { IMigrationConfiguration } from './model/migration-config.interface.js';
// import { PoolFactory } from '../postgres/factory/postgres-pool-factory.js';
// import { MigrationService as BaseService } from './migration-service.js';


// export class MigrationService {

//     public static runMigrations(
//         persistenceConfig: IPersistenceConfig,
//         migrationConfig: IMigrationConfiguration,
//     ): Promise<void> {
//         const currentFilename = url.fileURLToPath((import.meta as any).url);
//         const currentDirname = path.dirname(currentFilename);
//         const migrationRoot = path.resolve(currentDirname, '..', '..', 'migrations');
//         const pool = new PoolFactory().makePool(persistenceConfig);
//         const connector = new PersistenceConnector(pool);
//         const service = new BaseService(migrationConfig, connector);
//         return service.setup()
//             .then(() => service.loadAndExecuteChanges(migrationRoot));
//     }

//     public static runRollback(
//         persistenceConfig: IPersistenceConfig,
//         migrationConfig: IMigrationConfiguration,
//     ): Promise<void> {
//         const currentFilename = url.fileURLToPath((import.meta as any).url);
//         const currentDirname = path.dirname(currentFilename);
//         const migrationRoot = path.resolve(currentDirname, '..', '..', 'migrations');
//         const pool = new PoolFactory().makePool(persistenceConfig);
//         const connector = new PersistenceConnector(pool);
//         const service = new BaseService(migrationConfig, connector);
//         return service.setup()
//             .then(() => service.loadAndExecuteRollbacks(migrationRoot));
//     }

// }