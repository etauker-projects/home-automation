export interface LogService {
    trace(message: string, tracker?: string, object?: any): void;
    debug(message: string, tracker?: string, object?: any): void;
    config(message: string, tracker?: string, object?: any): void;
    info(message: string, tracker?: string, object?: any): void;
    warn(message: string, tracker?: string, object?: any): void;
    error(message: string, tracker?: string, object?: any): void;
}