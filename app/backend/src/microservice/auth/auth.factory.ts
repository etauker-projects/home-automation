// import { AuthService } from './auth.service.js';
// import { Extractor } from '../environment/extractor.js';
// import { AuthConfig } from './config.interface.js';
// import { TokenAlgorithm } from '@etauker-projects/security-auth-api-client/dist/model/token-algorithm.type.js';

// export class AuthFactory {

//     /**
//      * Provides a convenient way to instantiate an auth service
//      * using configuration values from environment variables.
//      */
//     public static makeService(overrides: Partial<AuthConfig> = {}): AuthService {
//         const config = AuthFactory.makeConfig(overrides);
//         return new AuthService(config);
//     }

//     /**
//      * Provides a convenient way to instantiate an auth
//      * configuration using values from environment variables.
//      */
//     public static makeConfig(overrides: Partial<AuthConfig> = {}): AuthConfig {
//         return {
//             secretKey: Extractor.extractString('JWT_SECRET'),
//             issuer: Extractor.extractString('JWT_ISSUER', 'com.etauker.login'),
//             audience: Extractor.extractString('JWT_AUDIENCE', 'com.etauker.production'),
//             algorithm: Extractor.extractEnum('JWT_ALGORITHM', [ 'HS256', 'HS512' ], 'HS512') as TokenAlgorithm,
//             ...overrides,
//         };
//     }

// }