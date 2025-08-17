// /* eslint-disable no-process-env */

// import dotenv from 'dotenv.js';
// import { IMigrationConfiguration } from '@etauker/connector-postgres.js';
// import { PersistenceFactory } from '../persistence/persistence.factory.js';
// import * as module from './migration.service.js';

// dotenv.config({ path: 'config/.env' });

// type MIGRATION_TYPE = 'change' | 'rollback';
// const type: MIGRATION_TYPE = process.argv.includes('--rollback')
//     ? 'rollback'
//     : 'change'
// ;

// const persistenceConfig = PersistenceFactory.makeConfig();

// // console.log('Persistence config: ');
// // console.log(persistenceConfig);

// const migrationConfig: IMigrationConfiguration = {
//     debug: true,
// };

// if (type === 'change') {
//     module.MigrationService.runMigrations(persistenceConfig, migrationConfig);
// } else {
//     module.MigrationService.runRollback(persistenceConfig, migrationConfig);
// }