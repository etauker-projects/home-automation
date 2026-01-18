import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { TokenService } from './token.service.js';
import { User } from '../users/user.js';
import { HttpError } from '../api/http-error.js';
import { Config } from './config.interface.js';
import { Token } from './token.js';

// Mock the dependencies
vi.mock('../logs/log.module.js', () => ({
    LogFactory: {
        makeService: () => ({
            debug: vi.fn(),
            trace: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        })
    }
}));

vi.mock('../configuration/configuration.module.js', () => ({
    ConfigurationService: {
        getInstance: () => ({
            isInDevelopmentMode: vi.fn(() => true)
        })
    }
}));

describe('TokenService', () => {
    const testConfig: Config = {
        enabled: true,
        secretKey: 'test-secret-key-for-signing',
        issuer: 'test-issuer',
        audience: 'test-audience',
        algorithm: 'HS256',
        expiresIn: 3600
    };

    const testUser = new User(null, 'user-123', 'testuser', 'password-hash');
    const sessionId = crypto.randomUUID();
    const randomString = crypto.randomBytes(32).toString('hex');

    let tokenService: TokenService;

    beforeEach(() => {
        // Create a mock connector (not actually used in the service)
        const mockConnector = {} as any;
        tokenService = new TokenService(mockConnector, testConfig);
    });

    describe('constructor', () => {
        it('should create a TokenService instance with enabled JWT', () => {
            expect(tokenService).toBeDefined();
            expect(tokenService.isEnabled()).toBe(true);
        });

        it('should create a TokenService with disabled JWT in development', () => {
            const config: Config = { ...testConfig, enabled: false };
            const mockConnector = {} as any;
            const service = new TokenService(mockConnector, config);
            expect(service.isEnabled()).toBe(false);
        });
    });

    describe('isEnabled', () => {
        it('should return enabled status', () => {
            expect(tokenService.isEnabled()).toBe(true);
        });

        it('should return disabled status when JWT is disabled', () => {
            const config: Config = { ...testConfig, enabled: false };
            const mockConnector = {} as any;
            const service = new TokenService(mockConnector, config);
            expect(service.isEnabled()).toBe(false);
        });
    });

    describe('generateTokenSync', () => {
        it('should generate a valid token', () => {
            const token = tokenService.generateTokenSync(testUser, sessionId, randomString);
            expect(token).toBeInstanceOf(Token);
            expect(token.getValid()).toBe(true);
        });

        it('should include correct user information in token', () => {
            const token = tokenService.generateTokenSync(testUser, sessionId, randomString);
            expect(token.getUsername()).toBe('testuser');
            expect(token.getSubject()).toBe('user-123');
            expect(token.getId()).toBe(sessionId);
        });

        it('should include fingerprint in token', () => {
            const token = tokenService.generateTokenSync(testUser, sessionId, randomString);
            expect(token.getFingerprint()).toBeTruthy();
        });

        it('should include issuer and audience in token', () => {
            const token = tokenService.generateTokenSync(testUser, sessionId, randomString);
            expect(token.getIssuer()).toBe('test-issuer');
            expect(token.getAudience()).toBe('test-audience');
        });

        it('should include algorithm in token', () => {
            const token = tokenService.generateTokenSync(testUser, sessionId, randomString);
            expect(token.getAlgorithm()).toBe('HS256');
        });

        it('should have expiry timestamp in future', () => {
            const token = tokenService.generateTokenSync(testUser, sessionId, randomString);
            const expiryTimestamp = token.getExpiryTimestamp();
            const nowTimestamp = Math.floor(Date.now() / 1000);
            expect(expiryTimestamp).toBeGreaterThan(nowTimestamp);
        });

        it('should have issued at timestamp', () => {
            const token = tokenService.generateTokenSync(testUser, sessionId, randomString);
            const iatTimestamp = token.getIssuedAtTimestamp();
            const nowTimestamp = Math.floor(Date.now() / 1000);
            expect(Math.abs(iatTimestamp - nowTimestamp)).toBeLessThan(2);
        });
    });

    describe('generateToken (async)', () => {
        it('should generate a token asynchronously', async () => {
            const token = await tokenService.generateToken(testUser, sessionId, randomString);
            expect(token).toBeInstanceOf(Token);
            expect(token.getValid()).toBe(true);
            expect(token.getUsername()).toBe('testuser');
        });
    });

    describe('decodeToken', () => {
        it('should decode a valid token', async () => {
            const generated = tokenService.generateTokenSync(testUser, sessionId, randomString);
            const decoded = await tokenService.decodeToken(generated.getTokenString());
            expect(decoded.getValid()).toBe(true);
            expect(decoded.getUsername()).toBe('testuser');
        });

        it('should handle invalid tokens gracefully', async () => {
            const decoded = await tokenService.decodeToken('invalid.token.string');
            expect(decoded.getValid()).toBe(false);
        });
    });

    describe('getFingerprintHash', () => {
        it('should generate a consistent hash for the same input', () => {
            const random = 'test-random-string';
            const hash1 = tokenService.getFingerprintHash(random);
            const hash2 = tokenService.getFingerprintHash(random);
            expect(hash1).toBe(hash2);
        });

        it('should generate different hashes for different inputs', () => {
            const hash1 = tokenService.getFingerprintHash('random-1');
            const hash2 = tokenService.getFingerprintHash('random-2');
            expect(hash1).not.toBe(hash2);
        });

        it('should support custom algorithm', () => {
            const random = 'test-random';
            const sha256Hash = tokenService.getFingerprintHash(random, 'sha256');
            const sha512Hash = tokenService.getFingerprintHash(random, 'sha512');
            expect(sha256Hash).not.toBe(sha512Hash);
        });

        it('should support custom digest base', () => {
            const random = 'test-random';
            const base64Hash = tokenService.getFingerprintHash(random, 'sha256', 'base64');
            const hexHash = tokenService.getFingerprintHash(random, 'sha256', 'hex');
            expect(base64Hash).not.toBe(hexHash);
        });

        it('should return null on hashing error', () => {
            // Test with invalid algorithm name
            const result = tokenService.getFingerprintHash('test', 'invalid-algorithm');
            expect(result).toBeNull();
        });
    });

    describe('verifyToken', () => {
        it('should verify a valid token with correct fingerprint', async () => {
            const token = tokenService.generateTokenSync(testUser, sessionId, randomString);
            const verified = await tokenService.verifyToken(
                token.getTokenString(),
                randomString
            );
            expect(verified.getValid()).toBe(true);
            expect(verified.getUsername()).toBe('testuser');
        });

        it('should reject token with incorrect fingerprint', async () => {
            const token = tokenService.generateTokenSync(testUser, sessionId, randomString);
            const wrongRandom = 'wrong-random-string';

            try {
                await tokenService.verifyToken(
                    token.getTokenString(),
                    wrongRandom
                );
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(HttpError);
                expect((error as HttpError).code).toBe(401);
                expect((error as HttpError).message).toContain('fingerprint');
            }
        });

        it('should reject token missing subject', async () => {
            // Create a token without subject
            const tokenString = jwt.sign(
                {
                    id: sessionId,
                    user: 'testuser',
                    fingerprint: tokenService.getFingerprintHash(randomString),
                    // sub is missing
                },
                testConfig.secretKey,
                {
                    issuer: testConfig.issuer,
                    audience: testConfig.audience,
                    algorithm: testConfig.algorithm,
                    expiresIn: testConfig.expiresIn
                }
            );

            try {
                await tokenService.verifyToken(tokenString, randomString);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(HttpError);
                expect((error as HttpError).code).toBe(401);
                expect((error as HttpError).message).toContain('user information');
            }
        });

        it('should reject token missing username', async () => {
            // Create a token without user
            const tokenString = jwt.sign(
                {
                    id: sessionId,
                    sub: 'user-123',
                    fingerprint: tokenService.getFingerprintHash(randomString),
                    // user is missing
                },
                testConfig.secretKey,
                {
                    issuer: testConfig.issuer,
                    audience: testConfig.audience,
                    algorithm: testConfig.algorithm,
                    expiresIn: testConfig.expiresIn
                }
            );

            try {
                await tokenService.verifyToken(tokenString, randomString);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(HttpError);
                expect((error as HttpError).code).toBe(401);
                expect((error as HttpError).message).toContain('user information');
            }
        });

        it('should reject token missing fingerprint', async () => {
            // Create a token without fingerprint
            const tokenString = jwt.sign(
                {
                    id: sessionId,
                    user: 'testuser',
                    sub: 'user-123',
                    // fingerprint is missing
                },
                testConfig.secretKey,
                {
                    issuer: testConfig.issuer,
                    audience: testConfig.audience,
                    algorithm: testConfig.algorithm,
                    expiresIn: testConfig.expiresIn
                }
            );

            try {
                await tokenService.verifyToken(tokenString, randomString);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(HttpError);
                expect((error as HttpError).code).toBe(401);
                expect((error as HttpError).message).toContain('fingerprint');
            }
        });

        it('should reject expired token', async () => {
            // Create an expired token
            const expiredToken = jwt.sign(
                {
                    id: sessionId,
                    user: 'testuser',
                    sub: 'user-123',
                    fingerprint: tokenService.getFingerprintHash(randomString),
                },
                testConfig.secretKey,
                {
                    issuer: testConfig.issuer,
                    audience: testConfig.audience,
                    algorithm: testConfig.algorithm,
                    expiresIn: -1 // Already expired
                }
            );

            try {
                await tokenService.verifyToken(expiredToken, randomString);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(HttpError);
                expect((error as HttpError).code).toBe(401);
                expect((error as HttpError).message).toContain('expired');
            }
        });

        it('should reject token with invalid signature', async () => {
            const token = tokenService.generateTokenSync(testUser, sessionId, randomString);
            // Modify the token to invalidate signature
            const parts = token.getTokenString().split('.');
            const modified = parts[0] + '.' + parts[1] + '.invalidsignature';

            try {
                await tokenService.verifyToken(modified, randomString);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(HttpError);
                expect((error as HttpError).code).toBe(401);
            }
        });
    });

    describe('getSecret', () => {
        it('should return the secret key', () => {
            expect(tokenService.getSecret()).toBe('test-secret-key-for-signing');
        });
    });

    describe('generateDevelopmentToken', () => {
        it('should generate a development token when JWT is disabled', () => {
            const config: Config = { ...testConfig, enabled: false };
            const mockConnector = {} as any;
            const service = new TokenService(mockConnector, config);

            const tokenString = service.generateDevelopmentToken();
            expect(tokenString).toBeTruthy();
            expect(typeof tokenString).toBe('string');

            const decoded = jwt.decode(tokenString, { complete: false }) as any;
            expect(decoded.user).toBe('developer');
            expect(decoded.sub).toBe('f3fd6f44-4690-4143-8da5-8511b0b16936');
        });

        it('should merge custom token properties', () => {
            const config: Config = { ...testConfig, enabled: false };
            const mockConnector = {} as any;
            const service = new TokenService(mockConnector, config);

            const custom = { user: 'custom-user', sub: 'custom-sub' };
            const tokenString = service.generateDevelopmentToken(custom);

            const decoded = jwt.decode(tokenString, { complete: false }) as any;
            expect(decoded.user).toBe('custom-user');
            expect(decoded.sub).toBe('custom-sub');
        });

        it('should throw error when trying to generate development token with JWT enabled', () => {
            expect(() => {
                tokenService.generateDevelopmentToken();
            }).toThrow(HttpError);
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete token lifecycle', async () => {
            // Generate
            const generated = tokenService.generateTokenSync(testUser, sessionId, randomString);
            expect(generated.getValid()).toBe(true);

            // Decode
            const decoded = await tokenService.decodeToken(generated.getTokenString());
            expect(decoded.getUsername()).toBe('testuser');

            // Verify
            const verified = await tokenService.verifyToken(generated.getTokenString(), randomString);
            expect(verified.getValid()).toBe(true);
            expect(verified.getId()).toBe(sessionId);
        });

        it('should handle multiple users with different sessions', async () => {
            const user1 = new User(null, 'user-1', 'user1', 'hash1');
            const user2 = new User(null, 'user-2', 'user2', 'hash2');
            const session1 = crypto.randomUUID();
            const session2 = crypto.randomUUID();
            const random1 = crypto.randomBytes(32).toString('hex');
            const random2 = crypto.randomBytes(32).toString('hex');

            const token1 = tokenService.generateTokenSync(user1, session1, random1);
            const token2 = tokenService.generateTokenSync(user2, session2, random2);

            const verified1 = await tokenService.verifyToken(token1.getTokenString(), random1);
            const verified2 = await tokenService.verifyToken(token2.getTokenString(), random2);

            expect(verified1.getId()).toBe(session1);
            expect(verified2.getId()).toBe(session2);
            expect(verified1.getUsername()).toBe('user1');
            expect(verified2.getUsername()).toBe('user2');
        });
    });
});
