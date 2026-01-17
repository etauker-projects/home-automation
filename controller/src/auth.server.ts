import { PersistenceConnector } from './persistence/persistence.module.js';
// import { IPersistenceConfig } from './persistence/persistence.module.js';
// import { LogFactory } from './logs/log.factory.js';
// import { LogService } from './logs/log.service.js';
// import { RoleController } from './roles/role.controller.js';
// import { SessionController } from './sessions/session.controller.js';
// import { UserController } from './users/user.controller.js';
import { PersistenceFactory } from './persistence/persistence.factory.js';
import { Server } from './server/server.js';

export class AuthServer extends Server<AuthServer> {

    private _connector!: PersistenceConnector;

    constructor(port: number = 9999, apiRoot: string = '/api/security/auth', connector?: PersistenceConnector) {
        super(port, apiRoot);
        this.setConnector(connector);
    }

    public setConnector(connector?: PersistenceConnector): AuthServer {
        if (!connector) {
            this.logger.trace('No persistence connector provided, creating new one from environment variables');
            const config = PersistenceFactory.makeConfig();
            this.logger.debug('Read persistence configuration', undefined, { ...config, password: '=====' });
            connector = PersistenceFactory.makeConnector(config);
            this.logger.trace('PersistenceConnector instantiated');
        }

        this._connector = connector;
        this.logger.trace('Persistence connector set');
        return this;
    }

    public start(): AuthServer {
        const connector = this._connector;
        // this.register('/v1/roles', RoleController.getInstance(connector).getRouter())
        //     .register('/v1/users', UserController.getInstance(connector).getRouter())
        //     .register('/v1/sessions', SessionController.getInstance(connector).getRouter());
        super.start();
        return this;
    }

    public stop(): AuthServer {
        // RoleController.resetInstance();
        // UserController.resetInstance();
        // SessionController.resetInstance();
        super.stop();
        return this;
    }
}