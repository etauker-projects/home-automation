import { describe, it, expect, vi, beforeEach } from 'vitest';
import moment from 'moment';
import { AuthClient } from './auth.client.js';
import { ILogger } from './model/logger.interface.js';
import { Config } from './model/config.interface.js';
import { StartResponse } from './model/start.response.js';
import { TokenType } from './model/token.type.js';

// Mock dependencies
const mockTokenServiceInstance = {
    decodeToken: vi.fn(),
};

const mockAuthConnectorInstance = {
    startSession: vi.fn(),
    invalidateSession: vi.fn(),
};

const mockOfflineClientInstance = {
    decodeToken: vi.fn(),
    verify: vi.fn(),
};

vi.mock('./service/token.service.js', () => ({
    TokenService: class {
        decodeToken = mockTokenServiceInstance.decodeToken;
    },
}));

vi.mock('./connector/auth-connector.js', () => ({
    AuthConnector: class {
        startSession = mockAuthConnectorInstance.startSession;
        invalidateSession = mockAuthConnectorInstance.invalidateSession;
    },
}));

vi.mock('./offline.client.js', () => ({
    OfflineClient: class {
        decodeToken = mockOfflineClientInstance.decodeToken;
        verify = mockOfflineClientInstance.verify;
    },
}));

describe('AuthClient', () => {
    let authClient: AuthClient;
    let mockLogger: ILogger;
    let mockConfig: Config;

    const host = 'http://localhost:3000';
    const mode = 'production';

    beforeEach(() => {
        // Create mock logger
        mockLogger = {
            trace: vi.fn(),
            debug: vi.fn(),
            config: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };

        // Create mock config
        mockConfig = {
            secretKey: 'test-secret-key',
            issuer: 'test-issuer',
            audience: 'test-audience',
            algorithm: 'HS256',
        };

        // Reset mocks
        vi.clearAllMocks();

        // Create AuthClient instance
        authClient = new AuthClient(host, mode, mockLogger, mockConfig);
    });

    describe('constructor', () => {
        it('should create an instance with production mode when mode is "production"', () => {
            const client = new AuthClient(host, 'production', mockLogger, mockConfig);
            expect(client).toBeInstanceOf(AuthClient);
        });

        it('should create an instance with production mode when mode is "PRODUCTION"', () => {
            const client = new AuthClient(host, 'PRODUCTION', mockLogger, mockConfig);
            expect(client).toBeInstanceOf(AuthClient);
        });

        it('should create an instance with development mode when mode is "development"', () => {
            const client = new AuthClient(host, 'development', mockLogger, mockConfig);
            expect(client).toBeInstanceOf(AuthClient);
        });

        it('should create an instance with development mode when mode is "DEVELOPMENT"', () => {
            const client = new AuthClient(host, 'DEVELOPMENT', mockLogger, mockConfig);
            expect(client).toBeInstanceOf(AuthClient);
        });

        it('should default to production mode for any other value', () => {
            const client = new AuthClient(host, 'invalid-mode', mockLogger, mockConfig);
            expect(client).toBeInstanceOf(AuthClient);
        });
    });

    describe('decodeToken', () => {
        it('should delegate to offlineClient.decodeToken', () => {
            const encodedToken = 'encoded.jwt.token';
            const mockDecodedToken: TokenType = {
                id: 'session-123',
                sub: 'user-456',
                iat: moment().unix(),
                exp: moment().add(1, 'hour').unix(),
                aud: 'test-audience',
                iss: 'test-issuer',
                user: 'testuser',
                fingerprint: 'fingerprint-123',
                roles: [],
            };

            mockOfflineClientInstance.decodeToken.mockReturnValue(mockDecodedToken);

            const result = authClient.decodeToken(encodedToken);

            expect(mockOfflineClientInstance.decodeToken).toHaveBeenCalledWith(encodedToken);
            expect(result).toBe(mockDecodedToken);
        });
    });

    describe('login', () => {
        const username = 'testuser';
        const passwordBase64 = 'dGVzdHBhc3N3b3Jk';
        const userId = 'user-123';
        const sessionId = 'session-456';
        const jwt = 'encoded.jwt.token';
        const cookie = 'fingerprint=abc123; Path=/; HttpOnly';

        it('should successfully login and return session data', async () => {
            const issuedAt = moment.utc();
            const expiresAt = moment.utc().add(1, 'hour');

            const mockStartResponse: StartResponse = {
                dto: {
                    session_id: sessionId,
                    user_id: userId,
                    jwt: jwt,
                    issued_at: issuedAt.toISOString(),
                    expires_at: expiresAt.toISOString(),
                    invalidated_at: null,
                    info: 'Session started',
                },
                headers: {
                    'set-cookie': [cookie],
                },
            };

            const mockDecodedToken: TokenType = {
                id: sessionId,
                sub: userId,
                iat: issuedAt.unix(),
                exp: expiresAt.unix(),
                aud: 'test-audience',
                iss: 'test-issuer',
                user: username,
                fingerprint: 'abc123',
                roles: [],
            };

            mockAuthConnectorInstance.startSession.mockResolvedValue(mockStartResponse);
            mockTokenServiceInstance.decodeToken.mockReturnValue(mockDecodedToken);

            const result = await authClient.login(username, passwordBase64);

            expect(mockAuthConnectorInstance.startSession).toHaveBeenCalledWith(username, passwordBase64);
            expect(mockTokenServiceInstance.decodeToken).toHaveBeenCalledWith(jwt);
            expect(mockLogger.debug).toHaveBeenCalledWith('JWT after login', '', mockDecodedToken);

            expect(result).toEqual({
                userId: userId,
                userName: username,
                sessionId: sessionId,
                loggedIn: true,
                meta: {
                    jwt: jwt,
                    cookie: cookie,
                },
            });
        });

        it('should throw error when JWT subject does not match user_id', async () => {
            const issuedAt = moment.utc();
            const expiresAt = moment.utc().add(1, 'hour');

            const mockStartResponse: StartResponse = {
                dto: {
                    session_id: sessionId,
                    user_id: userId,
                    jwt: jwt,
                    issued_at: issuedAt.toISOString(),
                    expires_at: expiresAt.toISOString(),
                    invalidated_at: null,
                    info: 'Session started',
                },
                headers: {
                    'set-cookie': [cookie],
                },
            };

            const mockDecodedToken: TokenType = {
                id: sessionId,
                sub: 'different-user-id',
                iat: issuedAt.unix(),
                exp: expiresAt.unix(),
                aud: 'test-audience',
                iss: 'test-issuer',
                user: username,
                fingerprint: 'abc123',
                roles: [],
            };

            mockAuthConnectorInstance.startSession.mockResolvedValue(mockStartResponse);
            mockTokenServiceInstance.decodeToken.mockReturnValue(mockDecodedToken);

            await expect(authClient.login(username, passwordBase64)).rejects.toThrow('incorrect JWT subject');
            expect(mockLogger.warn).toHaveBeenCalledWith('JWT was likely intercepted: incorrect JWT subject');
        });

        it('should throw error when JWT issued_at differs by more than 1 minute', async () => {
            const issuedAt = moment.utc();
            const expiresAt = moment.utc().add(1, 'hour');
            const wrongIssuedAt = moment.utc().subtract(5, 'minutes');

            const mockStartResponse: StartResponse = {
                dto: {
                    session_id: sessionId,
                    user_id: userId,
                    jwt: jwt,
                    issued_at: issuedAt.toISOString(),
                    expires_at: expiresAt.toISOString(),
                    invalidated_at: null,
                    info: 'Session started',
                },
                headers: {
                    'set-cookie': [cookie],
                },
            };

            const mockDecodedToken: TokenType = {
                id: sessionId,
                sub: userId,
                iat: wrongIssuedAt.unix(),
                exp: expiresAt.unix(),
                aud: 'test-audience',
                iss: 'test-issuer',
                user: username,
                fingerprint: 'abc123',
                roles: [],
            };

            mockAuthConnectorInstance.startSession.mockResolvedValue(mockStartResponse);
            mockTokenServiceInstance.decodeToken.mockReturnValue(mockDecodedToken);

            await expect(authClient.login(username, passwordBase64)).rejects.toThrow('incorrect JWT issue date');
            expect(mockLogger.warn).toHaveBeenCalledWith('JWT was likely intercepted: incorrect JWT issue date');
        });

        it('should throw error when JWT expires_at differs by more than 1 minute', async () => {
            const issuedAt = moment.utc();
            const expiresAt = moment.utc().add(1, 'hour');
            const wrongExpiresAt = moment.utc().add(2, 'hours');

            const mockStartResponse: StartResponse = {
                dto: {
                    session_id: sessionId,
                    user_id: userId,
                    jwt: jwt,
                    issued_at: issuedAt.toISOString(),
                    expires_at: expiresAt.toISOString(),
                    invalidated_at: null,
                    info: 'Session started',
                },
                headers: {
                    'set-cookie': [cookie],
                },
            };

            const mockDecodedToken: TokenType = {
                id: sessionId,
                sub: userId,
                iat: issuedAt.unix(),
                exp: wrongExpiresAt.unix(),
                aud: 'test-audience',
                iss: 'test-issuer',
                user: username,
                fingerprint: 'abc123',
                roles: [],
            };

            mockAuthConnectorInstance.startSession.mockResolvedValue(mockStartResponse);
            mockTokenServiceInstance.decodeToken.mockReturnValue(mockDecodedToken);

            await expect(authClient.login(username, passwordBase64)).rejects.toThrow('incorrect JWT expiry date');
            expect(mockLogger.warn).toHaveBeenCalledWith('JWT was likely intercepted: incorrect JWT expiry date');
        });

        it('should return loggedIn: false when session is invalidated', async () => {
            const issuedAt = moment.utc();
            const expiresAt = moment.utc().add(1, 'hour');
            const invalidatedAt = moment.utc().subtract(10, 'minutes');

            const mockStartResponse: StartResponse = {
                dto: {
                    session_id: sessionId,
                    user_id: userId,
                    jwt: jwt,
                    issued_at: issuedAt.toISOString(),
                    expires_at: expiresAt.toISOString(),
                    invalidated_at: invalidatedAt.toISOString(),
                    info: 'Session invalidated',
                },
                headers: {
                    'set-cookie': [cookie],
                },
            };

            const mockDecodedToken: TokenType = {
                id: sessionId,
                sub: userId,
                iat: issuedAt.unix(),
                exp: expiresAt.unix(),
                aud: 'test-audience',
                iss: 'test-issuer',
                user: username,
                fingerprint: 'abc123',
                roles: [],
            };

            mockAuthConnectorInstance.startSession.mockResolvedValue(mockStartResponse);
            mockTokenServiceInstance.decodeToken.mockReturnValue(mockDecodedToken);

            const result = await authClient.login(username, passwordBase64);

            expect(result.loggedIn).toBe(false);
        });

        it('should return loggedIn: false when session is expired', async () => {
            const issuedAt = moment.utc().subtract(2, 'hours');
            const expiresAt = moment.utc().subtract(1, 'hour');

            const mockStartResponse: StartResponse = {
                dto: {
                    session_id: sessionId,
                    user_id: userId,
                    jwt: jwt,
                    issued_at: issuedAt.toISOString(),
                    expires_at: expiresAt.toISOString(),
                    invalidated_at: null,
                    info: 'Session expired',
                },
                headers: {
                    'set-cookie': [cookie],
                },
            };

            const mockDecodedToken: TokenType = {
                id: sessionId,
                sub: userId,
                iat: issuedAt.unix(),
                exp: expiresAt.unix(),
                aud: 'test-audience',
                iss: 'test-issuer',
                user: username,
                fingerprint: 'abc123',
                roles: [],
            };

            mockAuthConnectorInstance.startSession.mockResolvedValue(mockStartResponse);
            mockTokenServiceInstance.decodeToken.mockReturnValue(mockDecodedToken);

            const result = await authClient.login(username, passwordBase64);

            expect(result.loggedIn).toBe(false);
        });

        it('should handle missing set-cookie header gracefully', async () => {
            const issuedAt = moment.utc();
            const expiresAt = moment.utc().add(1, 'hour');

            const mockStartResponse: StartResponse = {
                dto: {
                    session_id: sessionId,
                    user_id: userId,
                    jwt: jwt,
                    issued_at: issuedAt.toISOString(),
                    expires_at: expiresAt.toISOString(),
                    invalidated_at: null,
                    info: 'Session started',
                },
                headers: {},
            };

            const mockDecodedToken: TokenType = {
                id: sessionId,
                sub: userId,
                iat: issuedAt.unix(),
                exp: expiresAt.unix(),
                aud: 'test-audience',
                iss: 'test-issuer',
                user: username,
                fingerprint: 'abc123',
                roles: [],
            };

            mockAuthConnectorInstance.startSession.mockResolvedValue(mockStartResponse);
            mockTokenServiceInstance.decodeToken.mockReturnValue(mockDecodedToken);

            const result = await authClient.login(username, passwordBase64);

            expect(result.meta.cookie).toBeUndefined();
        });
    });

    describe('logout', () => {
        const beforeLogoutEncoded = 'before.logout.token';
        const afterLogoutEncoded = 'after.logout.token';
        const fingerprintCookie = 'fingerprint=abc123';
        const sessionId = 'session-456';
        const userId = 'user-123';
        const username = 'testuser';

        it('should successfully logout and return session data', async () => {
            const mockBeforeLogoutDecoded: TokenType = {
                id: sessionId,
                sub: userId,
                iat: moment().unix(),
                exp: moment().add(1, 'hour').unix(),
                aud: 'test-audience',
                iss: 'test-issuer',
                user: username,
                fingerprint: 'abc123',
                roles: [],
            };

            const mockAfterLogoutDecoded: TokenType = {
                ...mockBeforeLogoutDecoded,
            };

            mockTokenServiceInstance.decodeToken
                .mockReturnValueOnce(mockBeforeLogoutDecoded)
                .mockReturnValueOnce(mockAfterLogoutDecoded);
            mockAuthConnectorInstance.invalidateSession.mockResolvedValue(afterLogoutEncoded);

            const result = await authClient.logout(beforeLogoutEncoded, fingerprintCookie);

            expect(mockTokenServiceInstance.decodeToken).toHaveBeenCalledWith(beforeLogoutEncoded);
            expect(mockAuthConnectorInstance.invalidateSession).toHaveBeenCalledWith(
                sessionId,
                'production',
                beforeLogoutEncoded,
                fingerprintCookie
            );
            expect(mockTokenServiceInstance.decodeToken).toHaveBeenCalledWith(afterLogoutEncoded);
            expect(mockLogger.debug).toHaveBeenCalledWith('JWT after logout', '', mockAfterLogoutDecoded);

            expect(result).toEqual({
                userId: userId,
                userName: username,
                sessionId: sessionId,
                loggedIn: false,
                meta: {
                    jwt: afterLogoutEncoded,
                    cookie: fingerprintCookie,
                },
            });
        });

        it('should use development mode when client is in development mode', async () => {
            const devClient = new AuthClient(host, 'development', mockLogger, mockConfig);

            const mockBeforeLogoutDecoded: TokenType = {
                id: sessionId,
                sub: userId,
                iat: moment().unix(),
                exp: moment().add(1, 'hour').unix(),
                aud: 'test-audience',
                iss: 'test-issuer',
                user: username,
                fingerprint: 'abc123',
                roles: [],
            };

            mockTokenServiceInstance.decodeToken.mockReturnValue(mockBeforeLogoutDecoded);
            mockAuthConnectorInstance.invalidateSession.mockResolvedValue(afterLogoutEncoded);

            await devClient.logout(beforeLogoutEncoded, fingerprintCookie);

            expect(mockAuthConnectorInstance.invalidateSession).toHaveBeenCalledWith(
                sessionId,
                'development',
                beforeLogoutEncoded,
                fingerprintCookie
            );
        });
    });

    describe('verify', () => {
        const token = 'test.jwt.token';
        const cookie = 'fingerprint=abc123';
        const role = 'admin';

        it('should delegate to offlineClient.verify without role', async () => {
            mockOfflineClientInstance.verify.mockResolvedValue(true);

            const result = await authClient.verify(token, cookie);

            expect(mockOfflineClientInstance.verify).toHaveBeenCalledWith(token, cookie, undefined);
            expect(result).toBe(true);
        });

        it('should delegate to offlineClient.verify with role', async () => {
            mockOfflineClientInstance.verify.mockResolvedValue(true);

            const result = await authClient.verify(token, cookie, role);

            expect(mockOfflineClientInstance.verify).toHaveBeenCalledWith(token, cookie, role);
            expect(result).toBe(true);
        });

        it('should return false when verification fails', async () => {
            mockOfflineClientInstance.verify.mockResolvedValue(false);

            const result = await authClient.verify(token, cookie, role);

            expect(result).toBe(false);
        });
    });
});
