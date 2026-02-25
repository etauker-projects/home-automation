/* eslint-disable no-process-env */

import { LogFactory, type LogService } from './microservice/logs/log.module.js';
import { Server } from './microservice/server/server.js';
import { StatusController } from './microservice/status/status.module.js';


let logger: LogService;
let server: Server;

try {

    const port = parseInt(process.env?.PORT || '9999');
    logger = LogFactory.makeService();

    server = new Server({ port, apiRoot: '/api' });
    server.register('/status', StatusController.getInstance());
    server.start();

} catch (error: any) {

    if (logger!) logger.error(error?.message);
        else console.log(error);

    // authServer!?.stop();
    server!?.stop();

    // keeps pod running 1 minute to allow reading kubernetes logs
    const timeoutMs = process.env?.APP_CRASH_TIMEOUT_MS
        ? parseInt(process.env?.APP_CRASH_TIMEOUT_MS, 10)
        : 60000
    ;

    setTimeout(() => process.exit(1), timeoutMs);
}
