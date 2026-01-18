import sinon, { SinonStub } from 'sinon';
import { describe, it, beforeEach, expect } from 'vitest';
import { PersistenceTransaction } from './transaction/persistence-transaction.js';
import { IPersistenceConfig } from './model/persistence-config.interface.js';
import { PersistenceConnector } from './persistence-connector.js';
import { PersistenceTransactionMock } from './transaction/persistence-transaction.mock.js';
import { PoolFactoryMock } from './postgres/factory/postgres-pool-factory.mock.js';


describe('PersistenceConnector', () => {

    const INSERT_STATEMENT = 'INSERT something INTO mock;';
    const SELECT_STATEMENT = 'SELECT * FROM mock;';
    const UPDATE_STATEMENT = `UPDATE example SET name = 'New Name';`;
    const DELETE_STATEMENT = 'DELETE FROM example;';

    let config: IPersistenceConfig;
    let connector: PersistenceConnector;
    let transaction: PersistenceTransaction;
    let stub: sinon.SinonStub;

    beforeEach(() => {
        config = {
            database: 'database',
            user: 'user',
            password: 'password',
            host: 'host',
            port: 1234,
        }

        transaction = PersistenceTransactionMock.getInstance();
        const factory = new PoolFactoryMock();
        connector = new PersistenceConnector(factory.makePool(config));
        stub = sinon.stub(connector, 'transact').returns(transaction);
    })

    describe('insert', () => {

        it('should return correct affected row count for 1 INSERT statement', async () => {
            const sql = INSERT_STATEMENT;
            const result = await connector.insert(sql, []);
            expect(result).toBe(1);
            expect((transaction.continue as SinonStub).callCount).toBe(1);
        })

        it("should throw exception for 1 SELECT statement", async () => {
            const sql = SELECT_STATEMENT;
            await expect(connector.insert(sql, [])).rejects.toThrow("Insert method can only be used for 'INSERT' statements");
        })

        it("should throw exception for 1 UPDATE statement", async () => {
            const sql = UPDATE_STATEMENT;
            await expect(connector.insert(sql, [])).rejects.toThrow("Insert method can only be used for 'INSERT' statements");
        })

        it("should throw exception for 1 DELETE statement", async () => {
            const sql = DELETE_STATEMENT;
            await expect(connector.insert(sql, [])).rejects.toThrow("Insert method can only be used for 'INSERT' statements");
        })

        it('should throw exception for 2 INSERT statements', async () => {
            const sql = `${INSERT_STATEMENT} ${INSERT_STATEMENT}`;
            await expect(connector.insert(sql, [])).rejects.toThrow('SQL statement count exceeds allowed count. 2 statements provided, maximum allowed is 1');
        })

        it('should close a connection on commit', async () => {
            const sql = INSERT_STATEMENT;
            const result = await connector.insert(sql, [], { commit: true });
            expect(result).toBe(1);
            expect((transaction.end as SinonStub).calledOnceWith(true)).toBeTruthy();
        })

        it('should close a connection on rollback', async () => {
            const sql = INSERT_STATEMENT;
            const result = await connector.insert(sql, [], { commit: false });
            expect(result).toBe(1);
            expect((transaction.end as SinonStub).calledOnceWith(false)).toBeTruthy();
        })

        it('should close connection on error', async () => {
            const sql = INSERT_STATEMENT;
            const message = 'Something unexpected happened';
            (transaction.continue as SinonStub).rejects(new Error(message));

            await expect(connector.insert(sql, [])).rejects.toThrow(message);
            expect((transaction.end as SinonStub).calledOnceWith(false)).toBeTruthy();
        })
    })

    describe('select', () => {

        it("should throw exception for 1 INSERT statement", async () => {
            const sql = INSERT_STATEMENT;
            await expect(connector.select(sql, [])).rejects.toThrow("Select method can only be used for 'SELECT' statements");
        })

        it('should return results for 1 SELECT statement', async () => {
            const sql = SELECT_STATEMENT;
            const result = await connector.select(sql, []);
            expect(result.length).toBe(1);
            expect((transaction.continue as SinonStub).callCount).toBe(1);
        })

        it("should throw exception for 1 UPDATE statement", async () => {
            const sql = UPDATE_STATEMENT;
            await expect(connector.select(sql, [])).rejects.toThrow("Select method can only be used for 'SELECT' statements");
        })

        it("should throw exception for 1 DELETE statement", async () => {
            const sql = DELETE_STATEMENT;
            await expect(connector.select(sql, [])).rejects.toThrow("Select method can only be used for 'SELECT' statements");
        })

        it('should throw exception for 2 SELECT statements', async () => {
            const sql = "SELECT * FROM mock; SELECT * FROM mock;";
            await expect(connector.select(sql, [])).rejects.toThrow('SQL statement count exceeds allowed count. 2 statements provided, maximum allowed is 1');
        })

        it('should close a connection on rollback', async () => {
            const sql = SELECT_STATEMENT;
            const result = await connector.select(sql, []);
            expect(result.length).toBe(1);
            expect((transaction.end as SinonStub).calledOnceWith(false)).toBeTruthy();

        })

        it('should close connection on error', async () => {
            const sql = SELECT_STATEMENT;
            const message = 'Something unexpected happened';
            (transaction.continue as SinonStub).rejects(new Error(message));

            await expect(connector.select(sql, [])).rejects.toThrow(message);
            expect((transaction.end as SinonStub).calledOnceWith(false)).toBeTruthy();
        })
    })

    describe('update', () => {
        it("should throw exception for 1 INSERT statement", async () => {
            const sql = INSERT_STATEMENT;
            await expect(connector.update(sql, [])).rejects.toThrow("Update method can only be used for 'UPDATE' statements");
        })

        it("should throw exception for 1 SELECT statement", async () => {
            const sql = SELECT_STATEMENT;
            await expect(connector.update(sql, [])).rejects.toThrow("Update method can only be used for 'UPDATE' statements");
        })

        it('should return correct affected row count for 1 UPDATE statement', async () => {
            const sql = UPDATE_STATEMENT;
            const result = await connector.update(sql, []);
            expect(result).toBe(1);
            expect((transaction.continue as SinonStub).callCount).toBe(1);
        })

        it("should throw exception for 1 DELETE statement", async () => {
            const sql = DELETE_STATEMENT;
            await expect(connector.update(sql, [])).rejects.toThrow("Update method can only be used for 'UPDATE' statements");
        })

        it('should throw exception for 2 UPDATE statements', async () => {
            const sql = `${INSERT_STATEMENT} ${INSERT_STATEMENT}`;
            await expect(connector.update(sql, [])).rejects.toThrow('SQL statement count exceeds allowed count. 2 statements provided, maximum allowed is 1');
        })

        it('should close a connection on commit', async () => {
            const sql = UPDATE_STATEMENT;
            const result = await connector.update(sql, [], { commit: true });
            expect(result).toBe(1);
            expect((transaction.end as SinonStub).calledOnceWith(true)).toBeTruthy();

        })

        it('should close a connection on rollback', async () => {
            const sql = UPDATE_STATEMENT;
            const result = await connector.update(sql, [], { commit: false });
            expect(result).toBe(1);
            expect((transaction.end as SinonStub).calledOnceWith(false)).toBeTruthy();

        })

        it('should close connection on error', async () => {
            const sql = UPDATE_STATEMENT;
            const message = 'Something unexpected happened';
            (transaction.continue as SinonStub).rejects(new Error(message));

            await expect(connector.update(sql, [])).rejects.toThrow(message);
            expect((transaction.end as SinonStub).calledOnceWith(false)).toBeTruthy();
        })
    })

    describe('delete', () => {

        it("should throw exception for 1 INSERT statement", async () => {
            const sql = INSERT_STATEMENT;
            await expect(connector.delete(sql, [])).rejects.toThrow("Delete method can only be used for 'DELETE' statements");
        })

        it("should throw exception for 1 SELECT statement", async () => {
            const sql = SELECT_STATEMENT;
            await expect(connector.delete(sql, [])).rejects.toThrow("Delete method can only be used for 'DELETE' statements");
        })

        it("should throw exception for 1 UPDATE statement", async () => {
            const sql = UPDATE_STATEMENT;
            await expect(connector.delete(sql, [])).rejects.toThrow("Delete method can only be used for 'DELETE' statements");
        })

        it('should return correct affected row count for 1 DELETE statement', async () => {
            const sql = DELETE_STATEMENT;
            const result = await connector.delete(sql, []);
            expect(result).toBe(1);
            expect((transaction.continue as SinonStub).callCount).toBe(1);
        })

        it('should throw exception for 2 DELETE statements', async () => {
            const sql = `${DELETE_STATEMENT} ${DELETE_STATEMENT}`;
            await expect(connector.delete(sql, [])).rejects.toThrow('SQL statement count exceeds allowed count. 2 statements provided, maximum allowed is 1');
        })

        it('should close a connection on commit', async () => {
            const sql = DELETE_STATEMENT;
            const result = await connector.delete(sql, [], { commit: true });
            expect(result).toBe(1);
            expect((transaction.end as SinonStub).calledOnceWith(true)).toBeTruthy();

        })

        it('should close a connection on rollback', async () => {
            const sql = DELETE_STATEMENT;
            const result = await connector.delete(sql, [], { commit: false });
            expect(result).toBe(1);
            expect((transaction.end as SinonStub).calledOnceWith(false)).toBeTruthy();

        })

        it('should close connection on error', async () => {
            const sql = DELETE_STATEMENT;
            const message = 'Something unexpected happened';
            (transaction.continue as SinonStub).rejects(new Error(message));

            await expect(connector.delete(sql, [])).rejects.toThrow(message);
            expect((transaction.end as SinonStub).calledOnceWith(false)).toBeTruthy();
        })
    })
})
