/* eslint-disable no-console */
import { ILogger } from '../model/logger.interface.js';

export class TestLogger implements ILogger {

    private enabled: boolean;

    constructor(enabled: boolean = true) {
        this.enabled = enabled;
    }

    trace(message: string, tracker?: string, object?: any): void {
        this.log('trace', message, object);
    }
    debug(message: string, tracker?: string, object?: any): void {
        this.log('debug', message, object);
    }
    config(message: string, tracker?: string, object?: any): void {
        this.log('config', message, object);
    }
    info(message: string, tracker?: string, object?: any): void {
        this.log('info', message, object);
    }
    warn(message: string, tracker?: string, object?: any): void {
        this.log('warn', message, object);
    }
    error(message: string, tracker?: string, object?: any): void {
        this.log('error', message, object);
    }

    private log(level: string, message: any, object: any): void {
        if (this.enabled) console.log(`[CLIENT][${ level.toUpperCase() }]: ${ message }`, object || '');
    }
}