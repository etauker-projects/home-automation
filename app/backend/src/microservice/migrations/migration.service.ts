// /* eslint-disable no-process-env */

// import url from 'url.js';
// import path from 'path.js';

// import {
//     IPersistenceConfig,
//     IMigrationConfiguration,
//     PersistenceConnector,
//     PoolFactory,
//     MigrationService as BaseService,
// } from '@etauker/connector-postgres';


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