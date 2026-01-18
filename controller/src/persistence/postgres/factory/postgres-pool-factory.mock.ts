import sinon from 'sinon';
import { IPoolClient } from '../model/postgres-pool-client.interface.js';
import { IPoolConfig } from '../model/postgres-pool-config.interface.js';
import { IPoolFactory } from '../../model/pool-factory.interface.js';
import { IPool } from '../model/postgres-pool.interface.js';

export class PoolFactoryMock implements IPoolFactory {

    connect: sinon.SinonStub;

    constructor() {
        this.connect = sinon.stub().resolves();
    }

    makePool(config: IPoolConfig): IPool {
        return {
            connect: this.connect as () => Promise<IPoolClient>,
        } as IPool
    }
}