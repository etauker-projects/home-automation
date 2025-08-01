import { Request, Response } from 'express';
import { IResponse } from './response.interface';

export interface IEndpoint {
    method: string;
    endpoint: string;
    handler: (
        endpoint: string,
        req: Request,
        res: Response,
    ) => Promise<IResponse<any>>;
}

export interface IRequestContext {
    endpoint: string;
    tracer: string;
}

export interface IEndpointV2 {
    method: string;
    endpoint: string;
    handler: (
        context: IRequestContext,
        req: Request,
        res: Response,
    ) => Promise<IResponse<any>>;
}