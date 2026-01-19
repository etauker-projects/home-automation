/* eslint-disable require-await */
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { PersistenceConnector } from '../persistence/persistence.module.js';
import { RoleMapper } from './role.mapper.js';
import { RoleService } from './role.service.js';
import { RoleWithMetaDto } from './role-with-meta.dto.js';
import { ApiController, HttpError, IResponse } from '../api/api.module.js';
import { IncomingHttpHeaders } from 'node:http';
import { SessionService } from '../sessions/session.service.js';
import { Token } from '../tokens/token.module.js';


export class RoleController extends ApiController {

    private static instance?: RoleController;
    private router: express.Router;
    private service: RoleService;
    private sessionService: SessionService;


    // ===========================================
    //               CONSTRUCTOR
    // ===========================================
    constructor(connector: PersistenceConnector) {
        super(connector);
        // eslint-disable-next-line new-cap
        this.router = express.Router();
        this.service = new RoleService(connector);
        this.sessionService = new SessionService(connector);
    }

    // ===========================================
    //               STATIC FUNCTIONS
    // ===========================================
    public static getInstance(connector: PersistenceConnector): RoleController {
        if (!RoleController.instance) {
            RoleController.instance = new RoleController(connector);
        }
        return RoleController.instance;
    }

    public static resetInstance(): void {
        RoleController.instance = undefined;
    }


    // ===========================================
    //               PUBLIC FUNCTIONS
    // ===========================================
    public getRouter() {
        this.router.use((bodyParser as any).default.json());         // to support JSON-encoded bodies
        this.router.use(cookieParser.default());
        this.router.use((bodyParser as any).default.urlencoded({     // to support URL-encoded bodies
            extended: true
        }));

        //  Endpoint registrations
        this.registerEndpoints(this.router, [
            { method: 'get', endpoint: '', handler: this.getRoles },
            { method: 'get', endpoint: '/:id', handler: this.getRole },
            { method: 'post', endpoint: '', handler: this.postRole },
            { method: 'put', endpoint: '', handler: this.methodNotAllowedOnCollection },
            { method: 'put', endpoint: '/:id', handler: this.putRole },
            { method: 'patch', endpoint: '', handler: this.methodNotAllowedOnCollection },
            { method: 'patch', endpoint: '/:id', handler: this.patchRole },
            { method: 'delete', endpoint: '', handler: this.methodNotAllowedOnCollection },
            { method: 'delete', endpoint: '/:id', handler: this.deleteRole },
        ]);
        return this.router;
    }

    public async getRoles(
        endpoint: string,
        req: express.Request,
        res: express.Response,
    ): Promise<IResponse<RoleWithMetaDto[]>> {
        const token = await this.runSecurityChecks('com.etauker.security.roles.get', req?.cookies, req?.headers);
        const found = await this.service.getRoles(token.getSubject());
        const dtos = found.map(role => RoleMapper.toDtoWithMeta(role));
        return { status: 200, body: dtos };
    }

    public async getRole(
        endpoint: string,
        req: express.Request,
        res: express.Response,
    ): Promise<IResponse<RoleWithMetaDto>> {
        const token = await this.runSecurityChecks('com.etauker.security.roles.get', req?.cookies, req?.headers);
        const id = await this.validateUuid(req?.params?.id, true);
        const found = await this.service.getRole(token.getSubject(), id);
        const dto = RoleMapper.toDtoWithMeta(found);
        return { status: 200, body: dto };
    }

    public async postRole(
        endpoint: string,
        req: express.Request,
        res: express.Response,
    ): Promise<IResponse<RoleWithMetaDto>> {
        const token = await this.runSecurityChecks('com.etauker.security.roles.create', req?.cookies, req?.headers);
        const role = RoleMapper.fromDto(req?.body);
        const saved = await this.service.saveRole(token.getSubject(), role);
        const dto = RoleMapper.toDtoWithMeta(saved);
        return { status: 201, body: dto };
    }

    public async deleteRole(
        endpoint: string,
        req: express.Request,
        res: express.Response,
    ): Promise<IResponse<RoleWithMetaDto | string>> {
        try {

            const token = await this.runSecurityChecks('com.etauker.security.roles.delete', req?.cookies, req?.headers);
            const id = await this.validateUuid(req?.params?.id, true);
            const deleted = await this.service.deleteRole(token.getSubject(), id);
            const dto = RoleMapper.toDtoWithMeta(deleted);
            return { status: 204, body: dto };

        } catch (error: any) {

            // map 404 to 204 to make the endpoint idempotent
            if (error?.code === 404) {
                return { status: 204, body: '' };
            } else {
                throw error;
            }

        }
    }

    public async putRole(
        endpoint: string,
        req: express.Request,
        res: express.Response,
    ): Promise<IResponse<any>> {
        return { status: 501, body: { message: 'To be implemented' }};
    }

    public async patchRole(
        endpoint: string,
        req: express.Request,
        res: express.Response,
    ): Promise<IResponse<any>> {
        return { status: 501, body: { message: 'To be implemented' }};
    }

    public async methodNotAllowedOnCollection(
        endpoint: string,
        req: express.Request,
        res: express.Response,
    ): Promise<IResponse<any>> {
        res.setHeader('Allow', [ 'GET', 'POST' ]);
        return { status: 405, body: { message: 'Method not allowed on collection' }};
    }

    private async runSecurityChecks(
        requirement: string,
        cookies = {},
        headers: IncomingHttpHeaders = {},
    ): Promise<Token> {

        const token = await this.verifyProvidedToken(
            [ requirement ],
            cookies,
            headers,
        );

        const isInvalidated = await this.sessionService.isInvalidated(
            token.getSubject(),
            token.getId(),
        );

        if (isInvalidated) {
            throw new HttpError(401, 'Session expired');
        }

        return token;
    }
}
