import JWT from 'jsonwebtoken';
import crypto, { BinaryToTextEncoding } from 'crypto';
import { ILogger } from '../model/logger.interface.js';
import { Config } from '../model/config.interface.js';
import { Token } from '../model/token.js';
import { TokenType } from '../model/token.type.js';

// TODO: clean up
export class TokenService {

    private secretKey: string;
    private signingOptions: JWT.SignOptions;
    private logger: ILogger;

    constructor(config: Config, logger: ILogger) {
        this.logger = logger;
        this.secretKey = config.secretKey;
        this.signingOptions = {
            issuer: config.issuer,
            audience: config.audience,
            algorithm: config.algorithm,
        };
    }


    /**
    *   Returns a recoded token without verifying access privileges.
    */
    public decodeToken(encoded: string): TokenType {
        try {
            const options = { complete: true };
            const decoded = JWT.decode(encoded, options) as JWT.JwtPayload;
            const payload: TokenType = decoded.payload as TokenType;
            return payload;
        } catch (error) {
            this.logger.error('Error decoding token', '', error);
            throw new Error('Failed to decode token. It may be corrupt. Try to log out and log back in again.');
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
        let jwt: Token = null;

        // Verify token
        return new Promise<TokenType>((fnResolve, fnReject) => {
            this.logger.trace('Trying to decode token');
            try {
                const decoded: TokenType = JWT.verify(
                    encoded,
                    this.secretKey,
                    this.signingOptions
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
                throw new Error('Token is missing user information.');
            }

            if (!jwt.getValid()) {
                this.logger.warn(`Session token is invalid`, '', jwt.getRaw());
                throw new Error('User session has been terminated.');
            }

            if (!jwt.getFingerprint()) {
                this.logger.error('Fingerprint doesn\'t exist', '', jwt.getRaw());
                throw new Error('Token is missing fingerprint and may potentially be compromised.');
            }

            if (!this.verifyFingerprint(fingerprint, jwt.getFingerprint())) {
                this.logger.error('Fingerprint verification failed', '', jwt.getRaw());
                throw new Error('Incorrect fingerprint was provided. Token potentially compromised.');
            }

            // TODO: clean up
            // Optionally check if the token contains a role
            if (roleNames && roleNames.length > 0) {
                // this.logger.debug(`Required one of the following roles: ${roleNames.join(', ')}`);
                const hasRole = jwt.getRoles().some(role => roleNames.includes(role.name));
                // this.logger.debug(`User roles`, '', jwt.getRoles());
                if (!hasRole) {
                    throw new Error('User does not have sufficient privileges to access the resource.');
                }
                // this.logger.debug(`hasRole: ${hasRole}`);
            }

            this.logger.debug('Resolving with JWT', '', jwt.getRaw());
            return jwt;

        }).catch(error => {
            this.logger.error('Error verifying token', '', error);
            if (error.name === 'TokenExpiredError') {
                throw new Error('User session has expired.');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid authentication token provided. Try to log out and log back in again.');
            } else {
                throw error;
            }
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
    ): string => {
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

    private verifyFingerprint = (
        original: string,
        hash: string,
        algorithm?: string,
        base?: BinaryToTextEncoding
    ): boolean => {
        return hash === this.getFingerprintHash(original, algorithm, base);
    };
}
