// /* eslint-disable no-process-env */

// import dotenv from 'dotenv';
// import { IMigrationConfiguration } from '@etauker/connector-postgres';
// import { PersistenceFactory } from '../persistence/persistence.factory';
// import * as module from './migration.service';

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