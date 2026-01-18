import { PersistenceConnector } from '../persistence/persistence.module.js';
import { Extractor } from '../environment/extractor.js';
import { Config } from './config.interface.js';
import { TokenAlgorithm } from './token-algorithm.type.js';
import { TokenService } from './token.service.js';

export class TokenFactory {

    /**
     * Provides a convenient way to instantiate a token service
     * using configuration values from environment variables.
     */
    public static makeService(
        connector: PersistenceConnector,
        overrides: Partial<Config> = {},
    ): TokenService {
        const config = TokenFactory.makeConfig(overrides);
        return new TokenService(connector, config);
    }

    /**
     * Provides a convenient way to instantiate a jwt
     * configuration using values from environment variables.
     */
    public static makeConfig(overrides: Partial<Config> = {}): Config {
        return {
            enabled: Extractor.extractBoolean('JWT_ENABLED', true),
            secretKey: Extractor.extractString('JWT_SECRET'),
            issuer: Extractor.extractString('JWT_ISSUER', 'com.etauker.login'),
            audience: Extractor.extractString('JWT_AUDIENCE', 'com.etauker.production'),
            algorithm: Extractor.extractEnum('JWT_ALGORITHM', [ 'HS256', 'HS512' ], 'HS512') as TokenAlgorithm,
            expiresIn: Extractor.extractNumber('JWT_EXPIRES_IN', 60 * 60),
            ...overrides,
        };
    }
}