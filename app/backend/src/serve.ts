/* eslint-disable no-process-env */
import dotenv from 'dotenv';
// import { LogFactory } from './microservice/logs/log.module';
import { Server } from './microservice/server/server';
import { StatusController } from './microservice/status/status.controller';
// import { PersistenceFactory } from './microservice/persistence/persistence.factory';
// import { IngredientGroupController } from './ingredient-group/ingredient-group.controller';

dotenv.config({ path: 'config/.env' });

try {
    const port = parseInt(process.env?.PORT || '9999');
    const apiRoot = '/home-automation';

    // const logger = LogFactory.makeService();
    // const config = PersistenceFactory.makeConfig();
    // logger.debug('Read persistence configuration', undefined, { ...config, password: '=====' });
    // const connector = PersistenceFactory.makeConnector(config);
    const connector = {} as any;

    const server = new Server({ port, apiRoot })
        .register('/v1/status', StatusController.getInstance(connector))
        // .register('/v1/ingredient-group', IngredientGroupController.getInstance(connector))
        .start();

} catch (error) {
    console.log(error);

    // keeps pod running 1 minute to allow reading kubernetes logs
    const timeoutMs = process.env?.APP_CRASH_TIMEOUT_MS
        ? parseInt(process.env?.APP_CRASH_TIMEOUT_MS, 10)
        : 60000
    ;

    setTimeout(() => process.exit(1), timeoutMs);
}
