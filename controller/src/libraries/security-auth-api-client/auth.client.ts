import moment from 'moment';
import { Session } from './model/session.interface.js';
import { ILogger } from './model/logger.interface.js';
import { TokenService } from './service/token.service.js';
import { Config } from './model/config.interface.js';
import { TokenType } from './model/token.type.js';
import { AuthConnector } from './connector/auth-connector.js';
import { StartResponse } from './model/start.response.js';
import { OfflineClient } from './offline.client.js';

export class AuthClient {

    private readonly logger: ILogger;
    private readonly mode: string;
    private readonly tokenService: TokenService;
    private readonly authConnector: AuthConnector;
    private readonly offlineClient: OfflineClient;

    constructor(host: string, mode: string, logger: ILogger, config: Config) {
        this.mode = mode.toLowerCase() === 'development' ? 'development' : 'production';
        this.logger = logger;
        this.tokenService = new TokenService(config, logger);
        this.authConnector = new AuthConnector(host, logger);
        this.offlineClient = new OfflineClient(logger, config);
    }

    /**
    *   Returns a recoded token without verifying access privileges.
    */
    public decodeToken(encoded: string): TokenType {
        return this.offlineClient.decodeToken(encoded);
    }

    /**
    *   Calls the auth service to authenticate and start a new session.
    *   Returns session data, including the jwt and fingerprint cookie.
    *   The cookie should be sent to the client via a 'set-cookie' header.
    */
    public async login(username: string, passwordBase64: string): Promise<Session> {
        const response: StartResponse = await this.authConnector.startSession(username, passwordBase64);
        const decoded =  this.tokenService.decodeToken(response.dto.jwt);
        this.logger.debug('JWT after login', '', decoded);

        if (decoded.sub !== response.dto.user_id) {
            this.logger.warn('JWT was likely intercepted: incorrect JWT subject');
            throw new Error('incorrect JWT subject');
        }

        if (Math.abs(moment.unix(decoded.iat).diff(moment.utc(response?.dto?.issued_at, true), 'minutes').valueOf()) > 1) {
            this.logger.warn('JWT was likely intercepted: incorrect JWT issue date');
            throw new Error('incorrect JWT issue date');
        }

        if (Math.abs(moment.unix(decoded.exp).diff(moment.utc(response?.dto?.expires_at, true), 'minutes').valueOf()) > 1) {
            this.logger.warn('JWT was likely intercepted: incorrect JWT expiry date');
            throw new Error('incorrect JWT expiry date');
        }

        const loggedOut = response.dto.invalidated_at || moment.utc(response?.dto?.expires_at, true).isBefore(moment.utc());
        const cookie = (response.headers['set-cookie'] || [])[0];

        const session = {
            userId: response.dto.user_id,
            userName: decoded.user,
            sessionId: response.dto.session_id,
            loggedIn: !loggedOut,
            meta: {
                jwt: response.dto.jwt,
                cookie: cookie,
            }
        }

        return session;
    }

    /**
    *   Calls the auth service to end a session.
    *   Returns the session data for the invalidated session.
    *   The fingerprint cookie from 'cookie' header should be provided here.
    */
    public async logout(beforeLogoutEncoded: string, fingerprintCookie: string): Promise<Session> {
        const beforeLogoutDecoded =  this.tokenService.decodeToken(beforeLogoutEncoded);
        const afterLogoutEncoded = await this.authConnector.invalidateSession(beforeLogoutDecoded?.id, this.mode, beforeLogoutEncoded, fingerprintCookie);
        const afterLogoutDecoded =  this.tokenService.decodeToken(afterLogoutEncoded);
        this.logger.debug('JWT after logout', '', afterLogoutDecoded);

        const session = {
            userId: afterLogoutDecoded.sub,
            userName: afterLogoutDecoded.user,
            sessionId: afterLogoutDecoded.id,
            loggedIn: false,
            meta: {
                jwt: afterLogoutEncoded,
                cookie: fingerprintCookie,
            }
        }

        return session;
    }

    /**
    *   Checks if the provided token is valid.
    *   Does not make a call to check if the token has been invalided.
    */
   public async verify(token: string, cookie: string, role?: string): Promise<boolean> {
        // TODO: additionally implement a lookup call redis or auth service to check invalidated session.
        return this.offlineClient.verify(token, cookie, role);
    }
}
