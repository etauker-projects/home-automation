/* eslint-disable no-process-env */
import { AuthServer } from './auth.server.js';
import { LogFactory, type LogService } from './logs/logs.module.js';
import { PersistenceConnectorMock } from './test/persistence-connector.mock.js';

let logger: LogService;
let authServer: AuthServer;

try {
    const port = parseInt(process.env?.PORT || '9999');
    logger = LogFactory.makeService();

    // TODO: replace with real connector
    const mockConnector = new PersistenceConnectorMock().realistic();
    authServer = new AuthServer(port, '/api', mockConnector).start();

} catch (error: any) {

    if (logger!) logger.error(error?.message);
        else console.log(error);

    authServer!?.stop();

    // keeps pod running 1 minute to allow reading kubernetes logs
    const timeoutMs = process.env?.APP_CRASH_TIMEOUT_MS
        ? parseInt(process.env?.APP_CRASH_TIMEOUT_MS, 10)
        : 60000
    ;

    setTimeout(() => process.exit(1), timeoutMs);
}
