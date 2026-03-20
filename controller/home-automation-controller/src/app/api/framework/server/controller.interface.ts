import { Router } from 'express';

export interface IController {
    getRouter(prefix: string): Router;
    stop(): Promise<boolean>;
}