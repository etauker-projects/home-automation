import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OfflineClient } from './offline.client.js';
import { ILogger } from './model/logger.interface.js';
import { Config } from './model/config.interface.js';
import { TokenService } from './service/token.service.js';
import { TokenType } from './model/token.type.js';

describe('OfflineClient', () => {
    let offlineClient: OfflineClient;
    let mockLogger: ILogger;
    let mockConfig: Config;
    let decodeTokenSpy: any;
    let verifyTokenSpy: any;

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

        // Spy on TokenService prototype methods
        decodeTokenSpy = vi.spyOn(TokenService.prototype, 'decodeToken');
        verifyTokenSpy = vi.spyOn(TokenService.prototype, 'verifyToken');

        // Create instance
        offlineClient = new OfflineClient(mockLogger, mockConfig);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should create an instance successfully', () => {
            expect(offlineClient).toBeInstanceOf(OfflineClient);
            expect(offlineClient).toBeDefined();
        });
    });

    describe('decodeToken', () => {
        it('should decode a valid token', () => {
            const mockToken: TokenType = {
                id: 'session-123',
                sub: 'user-456',
                iat: 1234567890,
                exp: 1234567990,
                aud: 'test-audience',
                iss: 'test-issuer',
                user: 'testuser',
                fingerprint: 'fingerprint-hash',
                roles: [{ id: '1', name: 'admin', description: 'Administrator role' }],
            };

            decodeTokenSpy.mockReturnValue(mockToken);

            const result = offlineClient.decodeToken('valid.token.string');

            expect(decodeTokenSpy).toHaveBeenCalledWith('valid.token.string');
            expect(result).toEqual(mockToken);
        });

        it('should propagate errors from token service', () => {
            const error = new Error('Failed to decode token');
            decodeTokenSpy.mockImplementation(() => {
                throw error;
            });

            expect(() => offlineClient.decodeToken('invalid.token')).toThrow('Failed to decode token');
            expect(decodeTokenSpy).toHaveBeenCalledWith('invalid.token');
        });
    });

    describe('verify', () => {
        it('should return true for a valid token without role', async () => {
            verifyTokenSpy.mockResolvedValue({} as any);

            const result = await offlineClient.verify('valid.token', 'cookie-value');

            expect(verifyTokenSpy).toHaveBeenCalledWith('valid.token', 'cookie-value', []);
            expect(result).toBe(true);
        });

        it('should return true for a valid token with role', async () => {
            verifyTokenSpy.mockResolvedValue({} as any);

            const result = await offlineClient.verify('valid.token', 'cookie-value', 'admin');

            expect(verifyTokenSpy).toHaveBeenCalledWith('valid.token', 'cookie-value', ['admin']);
            expect(result).toBe(true);
        });

        it('should return false and log warning when token verification fails', async () => {
            const error = new Error('Token verification failed');
            verifyTokenSpy.mockRejectedValue(error);

            const result = await offlineClient.verify('invalid.token', 'cookie-value');

            expect(verifyTokenSpy).toHaveBeenCalledWith('invalid.token', 'cookie-value', []);
            expect(mockLogger.warn).toHaveBeenCalledWith('Error verifying token', '', error);
            expect(result).toBe(false);
        });

        it('should return false when token verification fails with role', async () => {
            const error = new Error('Insufficient privileges');
            verifyTokenSpy.mockRejectedValue(error);

            const result = await offlineClient.verify('valid.token', 'cookie-value', 'admin');

            expect(verifyTokenSpy).toHaveBeenCalledWith('valid.token', 'cookie-value', ['admin']);
            expect(mockLogger.warn).toHaveBeenCalledWith('Error verifying token', '', error);
            expect(result).toBe(false);
        });

        it('should handle different types of verification errors', async () => {
            const expiredError = new Error('Token expired');
            verifyTokenSpy.mockRejectedValue(expiredError);

            const result = await offlineClient.verify('expired.token', 'cookie-value');

            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith('Error verifying token', '', expiredError);
        });
    });
});
