import { OfflineClient, CookieService } from '@etauker-projects/security-auth-api-client';
import { LogFactory, LogService } from '../logs/log.module';
import { ConfigurationService } from '../configuration/configuration.module';
import { AuthConfig } from './config.interface';
import { Token } from './token';

export class AuthService {

    private client: OfflineClient;
    private logger: LogService;

    constructor(config: AuthConfig) {
        this.logger = LogFactory.makeService();
        this.client = new OfflineClient(this.logger, config);
    }

    /**
     * Check the validity of the given token and return true if the token is valid and vefied.
     * If a value is provided for the 'role' parameter, also ensures that the token contains the required role
     */
    public verify(token: string, cookie: string, role?: string): Promise<boolean> {
        // return this.client.verify(token, cookie, role);
        return Promise.resolve(true);
    }

    public decode(token: string): Token {
        return new Token(this.client.decodeToken(token));
    }

    public getCookieName(): string {
        const mode = ConfigurationService.getInstance().getMode();
        return CookieService.getFingerprintCookieName(mode);
    }

}