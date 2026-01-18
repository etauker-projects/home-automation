import { IPoolConfig } from '../postgres/model/postgres-pool-config.interface.js';
import { IPool } from '../postgres/model/postgres-pool.interface.js';

export interface IPoolFactory {

    // note: could be static but TS interfaces have issues with static methods
    makePool(config:IPoolConfig): IPool;

}