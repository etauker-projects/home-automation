import sinon from 'sinon';
import { describe, it, beforeEach, expect } from 'vitest';
import { PersistenceTransaction } from './persistence-transaction.js';
import { IPoolClient } from '../postgres/model/postgres-pool-client.interface.js';

describe('PersistenceTransaction', () => {

    let client: IPoolClient;
    let transaction: PersistenceTransaction;
    let mock: {
        query: sinon.SinonStub;
        release: sinon.SinonStub;
    };

    beforeEach(() => {
        mock = {
            release: sinon.stub().resolves(),
            query: sinon.stub()
                .onFirstCall().resolves()
                .onSecondCall().callsFake((...args) => {
                    if (args[0].toUpperCase().includes('SELECT')) {
                        return Promise.resolve({ command: 'SELECT', rows: ['abc', 'xyz'] })
                    }
                    if (args[0].toUpperCase().includes('INSERT')) {
                        return Promise.resolve({ command: 'INSERT', rowCount: 1 })
                    }
                    if (args[0].toUpperCase().includes('UPDATE')) {
                        return Promise.resolve({ command: 'UPDATE', rowCount: 3 })
                    }
                    if (args[0].toUpperCase().includes('DELETE')) {
                        return Promise.resolve({ command: 'DELETE', rowCount: 5 })
                    }
                    else return Promise.resolve({ command: args[0] });
                }),
        };
        client = mock as any as IPoolClient;
        transaction = new PersistenceTransaction(Promise.resolve(client));
    })

    describe('constructor', () => {
        it('should begin transaction', async () => {
            await transaction.ready();
            expect(mock.query.calledOnce).toBeTruthy();
            expect(mock.query.calledWith('BEGIN')).toBeTruthy();
        })
    })

    describe('continue', () => {
        it('should forward correct parameters to database client', async () => {
            const sql = 'SELECT name FROM test WHERE id = ?';
            const params = [ 'abcd' ];

            await transaction.ready();
            await transaction.continue(sql, params);

            expect(mock.query.calledTwice).toBeTruthy();
            expect(mock.query.getCall(1).args[0]).toBe(sql);
            expect(mock.query.getCall(1).args[1].join(', ')).toBe(params.join(', '));
        })

        it('should throw exception if transaction is already complete', async () => {
            const sql = 'SELECT name FROM test WHERE id = ?';
            const params = [ 'abcd' ];

            await transaction.ready();
            await transaction.end(true);
            await expect(transaction.continue(sql, params)).rejects.toThrow('Database transaction already completed');
        })
    })

    describe('end', () => {
        it('(commit = true) => should end transaction with a commit', async () => {
            await transaction.end(true);
            expect(mock.query.calledTwice).toBeTruthy();
            const secondCallArg = mock.query.getCall(1).args[0];
            expect(secondCallArg).toBe('COMMIT');
        })

        it('(commit = true) => should release a connection after a commit', async () => {
            await transaction.end(true);
            expect(mock.release.calledOnce).toBeTruthy();
        })

        it('(commit = true) => should throw exception if transaction is already complete', async () => {
            await transaction.ready();
            await transaction.end(true);
            await expect(transaction.end(true)).rejects.toThrow('Cannot COMMIT database transaction, transaction already completed');
        })

        it('(commit = false) => should end transaction with a rollback', async () => {
            await transaction.end(false);
            expect(mock.query.calledTwice).toBeTruthy();
            const secondCallArg = mock.query.getCall(1).args[0];
            expect(secondCallArg).toBe('ROLLBACK');
        })

        it('(commit = false) => should release a connection after a rollback', async () => {
            await transaction.end(false);
            expect(mock.release.calledOnce).toBeTruthy();
        })

        it('(commit = false) => should throw exception if transaction is already complete', async () => {
            await transaction.ready();
            await transaction.end(false);
            await expect(transaction.end(false)).rejects.toThrow('Cannot ROLLBACK database transaction, transaction already completed');
        })
    })

    describe('commit', () => {
        it('should end transaction with a commit', async () => {
            await transaction.commit();
            expect(mock.query.calledTwice).toBeTruthy();
            const secondCallArg = mock.query.getCall(1).args[0];
            expect(secondCallArg).toBe('COMMIT');
        })

        it('should release a connection after a commit', async () => {
            await transaction.commit();
            expect(mock.release.calledOnce).toBeTruthy();
        })

        it('should throw exception if transaction is already complete', async () => {
            await transaction.ready();
            await transaction.commit();
            await expect(transaction.commit()).rejects.toThrow('Cannot COMMIT database transaction, transaction already completed');
        })
    })

    describe('rollback', () => {
        it('should end transaction with a rollback', async () => {
            await transaction.rollback();
            expect(mock.query.calledTwice).toBeTruthy();
            const secondCallArg = mock.query.getCall(1).args[0];
            expect(secondCallArg).toBe('ROLLBACK');
        })

        it('should release a connection after a rollback', async () => {
            await transaction.rollback();
            expect(mock.release.calledOnce).toBeTruthy();
        })

        it('should throw exception if transaction is already complete', async () => {
            await transaction.ready();
            await transaction.rollback();
            await expect(transaction.rollback()).rejects.toThrow('Cannot ROLLBACK database transaction, transaction already completed');
        })
    })

    describe('isOpen', () => {
        it('should return true before query (connection not closed)', async () => {
            expect(await transaction.isOpen()).toBe(true);
        })

        it('should return true after query (connection not closed)', async () => {
            await transaction.continue('SELECT true');
            expect(await transaction.isOpen()).toBe(true);
        })

        it('should return false after commit', async () => {
            await transaction.commit();
            expect(await transaction.isOpen()).toBe(false);
        })

        it('should return false after rollback', async () => {
            await transaction.rollback();
            expect(await transaction.isOpen()).toBe(false);
        })

        it('should return false after end (commit = true)', async () => {
            await transaction.end(true);
            expect(await transaction.isOpen()).toBe(false);
        })

        it('should return false after end (commit = false)', async () => {
            await transaction.end(false);
            expect(await transaction.isOpen()).toBe(false);
        })
    })

    describe('closeIfOpen', () => {
        it('should close connection if one was open (commit = true)', async () => {
            expect(await transaction.isOpen()).toBe(true);
            await transaction.closeIfOpen(true);
            expect(await transaction.isOpen()).toBe(false);
            expect(mock.release.calledOnce).toBeTruthy();
        })

        it('should close connection if one was open (commit = false)', async () => {
            expect(await transaction.isOpen()).toBe(true);
            await transaction.closeIfOpen(false);
            expect(await transaction.isOpen()).toBe(false);
            expect(mock.release.calledOnce).toBeTruthy();
        })

        it('should not throw error if commit was already called', async () => {
            expect(await transaction.isOpen()).toBe(true);
            await transaction.commit();
            expect(await transaction.isOpen()).toBe(false);
            await transaction.closeIfOpen(true);
            expect(await transaction.isOpen()).toBe(false);
            expect(mock.release.calledOnce).toBeTruthy();
        })

        it('should not throw error if rollback was already called', async () => {
            expect(await transaction.isOpen()).toBe(true);
            await transaction.rollback();
            expect(await transaction.isOpen()).toBe(false);
            await transaction.closeIfOpen(true);
            expect(await transaction.isOpen()).toBe(false);
            expect(mock.release.calledOnce).toBeTruthy();
        })
    })

})
