import { Router } from 'express';

export interface IController {
    // constructor(connector: PersistenceConnector);
    // getInstance(connector: PersistenceConnector): IController;
    // resetInstance(): void;
    getRouter(prefix: string): Router;
    stop(): Promise<boolean>;
}