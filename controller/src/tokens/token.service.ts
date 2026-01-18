import crypto, { BinaryToTextEncoding } from 'node:crypto';
import JWT from 'jsonwebtoken';

import { User } from '../users/user.js';
import { Token } from './token.js';
import { TokenType } from './token.type.js';
import { PersistenceConnector } from '../persistence/persistence.module.js';
import { ConfigurationService } from '../configuration/configuration.module.js';
import { LogFactory, LogService } from '../logs/log.module.js';
import { HttpError } from '../api/http-error.js';
import { Config } from './config.interface.js';

export class TokenService {

    private secretKey: string;
    private signingOptions: JWT.SignOptions;
    private logger: LogService;
    private enabled = true;

    constructor(connector: PersistenceConnector, config: Config) {
        this.logger = LogFactory.makeService();

        const inProdMode = !ConfigurationService
            .getInstance()
            .isInDevelopmentMode()
        ;

        if (inProdMode && !config.enabled) {
            this.logger.error('Invalid state: cannot disable security in production mode');
            throw new Error('Invalid state: cannot disable security in production mode');
        }
        this.enabled = config.enabled;
        this.secretKey = config.secretKey;
        this.signingOptions = {
            issuer: config.issuer,
            audience: config.audience,
            algorithm: config.algorithm,
            expiresIn: config.expiresIn,
        };
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    public generateToken(user: User, sessionId: string, random: string): Promise<Token> {
        return Promise.resolve(this.generateTokenSync(user, sessionId, random));
    }

    public generateTokenSync(user: User, sessionId: string, random: string): Token {

        const fingerprint: string | null = this.getFingerprintHash(random);
        this.logger.debug(`Security fingerprint: ${ fingerprint }`);

        try {
            this.logger.debug(`UUID selected: ${ sessionId }`);

            const decoded: Partial<TokenType> = {
                id: sessionId,
                user: user.getUsername(),
                sub: user.getId(),
                fingerprint: fingerprint || undefined,
                // roles: user.getRoles().map(role => role.getRaw())
            };
            this.logger.debug(`Decoded`, '', decoded);
            this.logger.trace(`JWT signing options`, '', this.signingOptions);

            const signed: string = JWT.sign(
                decoded,
                this.secretKey,
                this.signingOptions
            );

            this.logger.trace('Token signed');
            return new Token(signed);
        } catch (error) {
            this.logger.error('Token generation failed', '', error);
            if (error instanceof HttpError) {
                throw error;
            } else {
                throw new HttpError(500, 'Failed to sign the token. Unknown error occurred.');
            }
        }
    }

    /**
    *   Returns a recoded token without verifying access privileges.
    */
    public decodeToken(encoded: string): Promise<Token> {
        this.logger.trace('Trying to decode token without verification', '', this.signingOptions);
        try {
            return Promise.resolve(new Token(encoded));
        } catch (error) {
            this.logger.error('Error decoding token', '', error);
            throw new HttpError(401, 'Failed to decode token. It may be corrupt. Try to log out and log back in again.');
        }
    }

    /**
    *   Check if a token is valid, signed correctly, and the role exists if one is provided.
    */
    public verifyToken(
        encoded: string,
        fingerprint: string,
        roleNames?: string[]
    ): Promise<Token> {

        // Local variables
        let jwt: Token | null = null;

        // Verify token
        return new Promise<TokenType>((fnResolve, fnReject) => {
            this.logger.trace('Trying to decode token');
            try {
                // TODO: review
                // Convert audience to VerifyOptions format
                let audience: string | RegExp | [string | RegExp, ...(string | RegExp)[]] | undefined = undefined;
                if (this.signingOptions.audience) {
                    if (typeof this.signingOptions.audience === 'string') {
                        audience = this.signingOptions.audience;
                    } else if (Array.isArray(this.signingOptions.audience) && this.signingOptions.audience.length > 0) {
                        // Convert string[] to tuple format
                        audience = this.signingOptions.audience as [string, ...string[]];
                    }
                }

                const verifyOptions: JWT.VerifyOptions = {
                    issuer: this.signingOptions.issuer,
                    audience,
                    algorithms: this.signingOptions.algorithm ? [this.signingOptions.algorithm] : undefined,
                };
                const decoded: TokenType = JWT.verify(
                    encoded,
                    this.secretKey,
                    verifyOptions
                ) as any;
                fnResolve(decoded);
            } catch (error) {
                fnReject(error);
            }

        }).then((decoded: TokenType) => {
            this.logger.debug('Token decoded', '', decoded);

            jwt = new Token(encoded);
            this.logger.trace('JwtToken created');

            if (!jwt.getSubject() || !jwt.getUsername()) {
                this.logger.error(`Token is missing subject (${ jwt.getSubject() }) or username (${ jwt.getUsername() })`);
                throw new HttpError(401, 'Token is missing user information.');
            }

            if (!jwt.getValid()) {
                this.logger.warn(`Session token is invalid`, '', jwt.getRaw());
                throw new HttpError(401, 'User session has been terminated.');
            }

            if (!jwt.getFingerprint()) {
                this.logger.error('Fingerprint doesn\'t exist', '', jwt.getRaw());
                throw new HttpError(401, 'Token is missing fingerprint and may potentially be compromised.');
            }

            if (!this.verifyFingerprint(fingerprint, jwt.getFingerprint())) {
                this.logger.error('Fingerprint verification failed', '', jwt.getRaw());
                throw new HttpError(401, 'Incorrect fingerprint was provided. Token potentially compromised.');
            }

            // TODO: implement
            // // Optionally check if the token contains a role
            // if (roleNames && roleNames.length > 0) {
            //     // this.logger.debug(`Required one of the following roles: ${roleNames.join(', ')}`);
            //     const hasRole: boolean = (jwt.getRoles().some(role => roleNames.includes(role.name)));
            //     // this.logger.debug(`User roles`, '', jwt.getRoles());
            //     if (!hasRole) {  throw new HttpError(403, 'User does not have sufficient privileges to access the resource.') }
            //     // this.logger.debug(`hasRole: ${hasRole}`);
            // }

            this.logger.debug('Resolving with JWT', '', jwt.getRaw());
            return jwt;

        }).catch(error => {
            this.logger.error('Error verifying token', '', error);
            if (error.name === 'TokenExpiredError') {
                throw new HttpError(401, 'User session has expired.');
            } else if (error.name === 'JsonWebTokenError') {
                throw new HttpError(401, 'Invalid authentication token provided. Try to log out and log back in again.');
            } else if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(400, 'Unexpected error verifying token');
        });
    }

    public getSecret() {
        return this.secretKey;
    }

    /*
    *   Prevention from Token Hijacking
    *   https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/JSON_Web_Token_Cheat_Sheet_for_Java.md#token-sidejacking
    */
    public getFingerprintHash = (
        random: string,
        algorithm?: string,
        base?: BinaryToTextEncoding
    ): string | null => {
        const DEFAULT_HASHING_ALGORYTHM: string = 'sha256';
        const DEFAULT_DIGEST_BASE: BinaryToTextEncoding = 'base64';

        try {
            return crypto
                .createHash(algorithm || DEFAULT_HASHING_ALGORYTHM)
                .update(random)
                .digest(base || DEFAULT_DIGEST_BASE);
        } catch (error) {
            return null;
        }
    };

    public generateDevelopmentToken(token: Partial<TokenType> = {}): string {

        if (this.isEnabled()) {
            this.logger.warn('Attempted to generate development token while JWT is enabled');
            throw new HttpError(401, 'Unexpected authentication error occurred');
        }

        const defaultToken: Partial<TokenType> = {
            id: crypto.randomUUID(),
            sub: 'f3fd6f44-4690-4143-8da5-8511b0b16936',
            user: 'developer',
            fingerprint: '',
            // roles: [
            //     { id: '03c58495-65e1-4fd2-8470-d89202e8f82a', name: 'com.etauker.security.Admin', description: 'A security administrator' }
            // ]
        };

        return JWT.sign({
            ...defaultToken,
            ...token,
        }, this.secretKey, this.signingOptions);
    }

    private verifyFingerprint = (
        original: string,
        hash: string,
        algorithm?: string,
        base?: BinaryToTextEncoding
    ): boolean => {
        return hash === this.getFingerprintHash(original, algorithm, base);
    };
}
