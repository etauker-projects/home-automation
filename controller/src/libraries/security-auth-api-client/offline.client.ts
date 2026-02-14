import { ILogger } from './model/logger.interface.js';
import { TokenService } from './service/token.service.js';
import { Config } from './model/config.interface.js';
import { TokenType } from './model/token.type.js';

/**
 * Offline client provides a limited set of functionality for client-side verification and decoding.
 */
export class OfflineClient {

    private readonly logger: ILogger;
    private readonly tokenService: TokenService;

    constructor(logger: ILogger, config: Config) {
        this.logger = logger;
        this.tokenService = new TokenService(config, logger);
    }

    /**
    *   Returns a recoded token without verifying access privileges.
    */
    public decodeToken(encoded: string): TokenType {
        return this.tokenService.decodeToken(encoded);
    }

    /**
    *   Checks if the provided token is valid.
    *   Does not make a call to check if the token has been invalided.
    */
    public async verify(token: string, cookie: string, role?: string): Promise<boolean> {
        try {
            await this.tokenService.verifyToken(token, cookie, role ? [ role ] : []);
            return true;
        } catch (error) {
            this.logger.warn('Error verifying token', '', error);
            return false;
        }
    }
}
