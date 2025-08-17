import * as express from 'express';
import { randomUUID } from 'node:crypto';
import { IncomingHttpHeaders } from 'node:http';
import { HttpError, IEndpoint, IResponse, type IEndpointV2, type IRequestContext } from './api.module.js';
import { LogService, LogFactory } from '../logs/log.module.js';
// import { AuthService, AuthFactory, Token } from '../auth/auth.module.js';
import type { PersistenceConnector } from '../persistence/persistence.connector.js';


export class ApiController {

    protected logger: LogService;
    // private auth: AuthService;
    private router: express.Router;
    private stopped: boolean;

    constructor(connector: PersistenceConnector) {
        this.logger = LogFactory.makeService();
        // this.auth = AuthFactory.makeService();
        // eslint-disable-next-line new-cap
        this.router = express.Router();
        this.stopped = false;
    }

    public stop(): Promise<boolean> {
        this.stopped = true;
        return Promise.resolve(this.stopped);
    }

    public isStopped(): boolean {
        return this.stopped;
    }

    /**
     * @deprecated Use `registerEndpointsV2` instead.
     */
    protected registerEndpoints(
        prefix: string,
        registrations: IEndpoint[]
    ): express.Router {

        this.logger.info('Registering  endpoints:');
        registrations.forEach(registration => {
            const method = registration.method;
            const endpoint = registration.endpoint;
            const handler = async (req: express.Request, res: express.Response) => {
                try {
                    const { status, body } = await registration.handler.bind(
                        this, endpoint,
                    )(req, res);
                    this.logger.trace(`Returning a ${status} response`, '', body);
                    res.status(status).json(body);
                } catch (error) {
                    const { status, body } = this.parseError(error);
                    this.logger.warn(`Uncaught error: [${status}] ${ body.message }`, '', error);

                    res.status(status).json(body);
                }
            };

            (this.router as any)[method](endpoint, handler);
            this.logger.info(`-- ${ method.toUpperCase() } ${ prefix }${ endpoint }`);
        });
        return this.router;
    }

    /**
     * V2 generates tracer and passes it to handlers inside a request context together with the endpoint.
     * It also adds standardised logging of requests and responses.
     */
    protected registerEndpointsV2(
        prefix: string,
        registrations: IEndpointV2[]
    ): express.Router {

        this.logger.info('Registering  endpoints:');
        registrations.forEach(registration => {
            const tracer = randomUUID();
            const method = registration.method;
            const endpoint = registration.endpoint;
            const context: IRequestContext = {
                endpoint,
                tracer,
            };

            const handler = async (req: express.Request, res: express.Response) => {
                try {
                    this.logger.trace(`[${req.method} ${context.endpoint}]`, context.tracer, req.params);
                    const { status, body } = await registration.handler.bind(
                        this, context,
                    )(req, res);
                    this.logger.trace(`Returning a ${status} response`, context.tracer, body);
                    res.status(status).json(body);
                } catch (error) {
                    const { status, body } = this.parseError(error);
                    this.logger.warn(`Uncaught error: [${status}] ${ body.message }`, context.tracer, error);
                    res.status(status).json(body);
                }
            };

            (this.router as any)[method](endpoint, handler);
            this.logger.info(`-- ${ method.toUpperCase() } ${ prefix }${ endpoint }`);
        });
        return this.router;
    }

    protected parseError(error: any): IResponse<{ message: string }> {
        const status = typeof error?.code === 'number' ? error.code : 500;
        const message = error?.message || 'Unexpected error occurred';
        return { status, body: { message }};
    }

    protected validateUuid(id: string, pathParam: boolean = false): Promise<string> {
        const regex = new RegExp(`[a-zA-Z|\\d]{8}-[a-zA-Z|\\d]{4}-[a-zA-Z|\\d]{4}-[a-zA-Z|\\d]{4}-[a-zA-Z|\\d]{12}`, 'iu');
        if (!regex.test(id)) {
            if (pathParam) {
                throw new HttpError(404, 'Invalid UUID in path');
            } else {
                throw new HttpError(400, 'Invalid UUID provided');
            }
        }
        return Promise.resolve(id);
    }

    protected validateAuthorizationHeader(jwt?: string | string[]): string {
        if (!jwt) {
            throw new HttpError(401, 'Missing bearer token');
        } else if (Array.isArray(jwt)) {
            throw new HttpError(401, `Multiple 'Authorization' headers set`);
        } else {
            return jwt;
        }
    }

    protected extractBearerToken(authorizationHeader: string): string {
        const BEARER_REGEX = /bearer\s/iu;
        return authorizationHeader.replace(BEARER_REGEX, '');
    }

    // protected async verifyProvidedToken(
    //     requiredRole?: string,
    //     cookies: { [key: string]: string } = {},
    //     headers: IncomingHttpHeaders = {},
    // ): Promise<Token> {

    //     // extract fingerprint
    //     const cookieName = this.auth.getCookieName();
    //     const fingerprint: string = cookies[cookieName];

    //     // extract bearer token
    //     // NOTE: express converts incoming header names to lowercase
    //     const headerName = 'authorization';
    //     const authorizationHeader = this.validateAuthorizationHeader(headers[headerName]);
    //     const bearerToken = this.extractBearerToken(authorizationHeader);

    //     // verify token
    //     if (await this.auth.verify(bearerToken, fingerprint, requiredRole)) {
    //         return this.auth.decode(bearerToken);
    //     } else {
    //         throw new HttpError(401, 'Access denied');
    //     }
    // }

    // protected runSecurityChecks(
    //     permission: string,
    //     cookies: any,
    //     headers: any,
    // ): Promise<Token> {
    //     return this.verifyProvidedToken(permission, cookies, headers);
    // }

}

