// import mysql from 'mysql2/promise.js';

// export interface IPersistenceResult<T> {
//     inserted: number;
//     updated: number;
//     deleted: number;
//     results: T[];
// }

// export class PersistenceTransaction {

//     private client: mysql.PoolConnection;
//     private open: boolean = false;
//     // private complete: boolean = false;
//     private stack: Promise<any>;

//     /**
//      * Create a new database transaction.
//      */
//     constructor(connectionPromise: Promise<mysql.PoolConnection>) {
//         this.stack = connectionPromise.then(async connection => {
//             this.client = connection;
//             await this.client.beginTransaction();
//             this.open = true;
//         }).catch(error => {
//             // TODO: store error and throw whne checking if transaction is open
//             this.open = false;
//         });
//     }

//     /**
//      * Executes an SQL statement as part of the current transaction.
//      * Does not close the connection to allow multiple database queries in a single transaction.
//      * Ensure to call 'end' method after all SQL statements are completed.
//      */
//     public continue<T>(sql: string, params?: any[]): Promise<IPersistenceResult<T>> {
//         this.stack = this.stack
//             .then(async () => {

//                 if (!this.open) {
//                     throw new Error('Transation already closed');
//                 }

//                 const prepared = await this.client.prepare({ sql });
//                 const result = prepared.execute(params);
//                 // TODO add mapping
//                 return {
//                     inserted: 0,
//                     updated: 0,
//                     deleted: 0,
//                     results: [],
//                 };
//             })
//             .catch(error => {
//                 this.stack = Promise.reject(error);
//                 this.closeIfOpen(false);
//                 throw error;
//             });

//         return this.stack;
//     }

//     /**
//      * Commit the transaction and close the database connection.
//      */
//     commit(): Promise<void> {
//         return this.end(true);
//     }

//     /**
//      * Rollback the transaction and close the database connection.
//      */
//     rollback(): Promise<void> {
//         return this.end(false);
//     }

//     /**
//      * Complete the transaction and close the database connection.
//      * If 'commit' parameter is true, commits the transactions,
//      * otherwise rolls back all statements in this transaction.
//      */
//     end(commit: boolean): Promise<void> {
//         this.stack = this.stack.then(async () => {
//             const action = commit ? this.client.commit : this.client.rollback;
//             try {
//                 await action();
//             } catch (error) {
//                 // TODO: log error
//                 await this.closeIfOpen(false);
//             } finally {
//                 // TODO find difference between release and destroy
//                 // TODO find if either is needed if commit or rollback was called
//                 // this.client.destroy();
//                 this.client.release();
//                 this.open = false;
//             }
//         });
//         return this.stack.then();
//     }

//     /**
//      * Waits until all queued statements are completed and returns true if the transaction is not closed.
//      */
//     public isOpen(): Promise<boolean> {
//         return this.stack.then(() => this.open);
//     }

//     /**
//      * Closes the connection if it is open.
//      */
//     public closeIfOpen(commit: boolean): Promise<void> {
//         return this.isOpen().then(open => {
//             if (open) {
//                 this.end(commit);
//             }
//         });
//     }
// }


// // private client;
// // private open;
// // private complete;
// // private stack;


// // /**
// //  * Check for inconsistent state done automatically before each database transaction.
// //  * @deprecated will be made private in the future, isOpen() should be used instead.
// //  */
// // ready(): Promise<void>;
// // private mapResults;
// // private mapDataResult;
// // private getDefaultResult;
// // private addQueryResult;
// // private mergeResults;
// // }