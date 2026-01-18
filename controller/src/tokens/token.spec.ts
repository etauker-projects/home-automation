import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { Token } from './token.js';
import { TokenType } from './token.type.js';

describe('Token', () => {
    const testPayload: TokenType = {
        id: 'test-session-id',
        sub: 'test-subject',
        aud: 'test-audience',
        iss: 'test-issuer',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        user: 'testuser',
        fingerprint: 'test-fingerprint-hash'
    };

    const secret = 'test-secret-key';

    let validToken: string;
    let expiredToken: string;
    let invalidToken: string;

    beforeEach(() => {
        // Create valid token
        validToken = jwt.sign(testPayload, secret, {
            algorithm: 'HS256'
        });

        // Create expired token
        const expiredPayload = {
            ...testPayload,
            exp: Math.floor(Date.now() / 1000) - 3600 // expired 1 hour ago
        };
        expiredToken = jwt.sign(expiredPayload, secret, {
            algorithm: 'HS256'
        });

        // Invalid token (not JWT)
        invalidToken = 'not.a.valid.jwt.token';
    });

    describe('constructor', () => {
        it('should parse a valid JWT token', () => {
            const token = new Token(validToken);
            expect(token.getValid()).toBe(true);
            expect(token.getTokenString()).toBe(validToken);
        });

        it('should handle invalid JWT tokens gracefully', () => {
            const token = new Token(invalidToken);
            expect(token.getValid()).toBe(false);
            expect(token.getTokenString()).toBe('');
        });

        it('should detect the algorithm from token header', () => {
            const token = new Token(validToken);
            expect(token.getAlgorithm()).toBe('HS256');
        });

        it('should reject tokens with unsupported algorithms', () => {
            const unsupportedToken = jwt.sign(testPayload, secret, {
                algorithm: 'HS384' // Not in supported list (only HS256 and HS512 supported)
            } as any);

            const token = new Token(unsupportedToken);
            expect(token.getValid()).toBe(false);
        });

        it('should reject tokens with "none" algorithm', () => {
            // Create a token with "none" algorithm (security vulnerability)
            const noneToken = jwt.sign(testPayload, '', {
                algorithm: 'none'
            } as any);

            const token = new Token(noneToken);
            expect(token.getValid()).toBe(false);
        });
    });

    describe('getters', () => {
        let token: Token;

        beforeEach(() => {
            token = new Token(validToken);
        });

        it('should get token ID', () => {
            expect(token.getId()).toBe(testPayload.id);
        });

        it('should get username', () => {
            expect(token.getUsername()).toBe(testPayload.user);
        });

        it('should get subject', () => {
            expect(token.getSubject()).toBe(testPayload.sub);
        });

        it('should get audience', () => {
            expect(token.getAudience()).toBe(testPayload.aud);
        });

        it('should get issuer', () => {
            expect(token.getIssuer()).toBe(testPayload.iss);
        });

        it('should get issued at timestamp', () => {
            expect(token.getIssuedAtTimestamp()).toBe(testPayload.iat);
        });

        it('should get issued at as ISO string', () => {
            const issuedAtString = token.getIssuedAtString();
            expect(issuedAtString).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('should get expiry timestamp', () => {
            expect(token.getExpiryTimestamp()).toBe(testPayload.exp);
        });

        it('should get expiry as ISO string', () => {
            const expiryString = token.getExpiryString();
            expect(expiryString).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('should get fingerprint', () => {
            expect(token.getFingerprint()).toBe(testPayload.fingerprint);
        });

        it('should get raw token data', () => {
            const raw = token.getRaw();
            expect(raw).toMatchObject(testPayload);
        });

        it('should get token string', () => {
            expect(token.getTokenString()).toBe(validToken);
        });

        it('should get algorithm', () => {
            expect(token.getAlgorithm()).toBe('HS256');
        });

        it('should have non-empty signature', () => {
            expect(token.getSignature()).toBeTruthy();
            expect(token.getSignature().length).toBeGreaterThan(0);
        });

        it('should get valid status', () => {
            expect(token.getValid()).toBe(true);
        });

        it('should throw error when getting data from invalid token', () => {
            const invalidTokenObj = new Token(invalidToken);
            expect(() => invalidTokenObj.getId()).toThrow('Token is invalid');
            expect(() => invalidTokenObj.getUsername()).toThrow('Token is invalid');
            expect(() => invalidTokenObj.getSubject()).toThrow('Token is invalid');
            expect(() => invalidTokenObj.getAudience()).toThrow('Token is invalid');
        });
    });

    describe('setValid', () => {
        it('should set valid status to false', () => {
            const token = new Token(validToken);
            expect(token.getValid()).toBe(true);

            token.setValid(false);
            expect(token.getValid()).toBe(false);
        });

        it('should set valid status to true', () => {
            const token = new Token(invalidToken);
            expect(token.getValid()).toBe(false);

            token.setValid(true);
            expect(token.getValid()).toBe(true);
        });

        it('should return token instance for chaining', () => {
            const token = new Token(validToken);
            const result = token.setValid(false);
            expect(result).toBe(token);
        });
    });

    describe('HS512 algorithm support', () => {
        it('should accept HS512 tokens', () => {
            const hs512Token = jwt.sign(testPayload, secret, {
                algorithm: 'HS512'
            });

            const token = new Token(hs512Token);
            expect(token.getValid()).toBe(true);
            expect(token.getAlgorithm()).toBe('HS512');
        });
    });

    describe('edge cases', () => {
        it('should handle empty token string', () => {
            const token = new Token('');
            expect(token.getValid()).toBe(false);
        });

        it('should handle malformed JWT structure', () => {
            const token = new Token('header.payload'); // Missing signature
            expect(token.getValid()).toBe(false);
        });

        it('should extract all token claims correctly', () => {
            const token = new Token(validToken);
            const raw = token.getRaw();

            expect(raw.id).toBe(testPayload.id);
            expect(raw.sub).toBe(testPayload.sub);
            expect(raw.aud).toBe(testPayload.aud);
            expect(raw.iss).toBe(testPayload.iss);
            expect(raw.iat).toBe(testPayload.iat);
            expect(raw.exp).toBe(testPayload.exp);
            expect(raw.user).toBe(testPayload.user);
            expect(raw.fingerprint).toBe(testPayload.fingerprint);
        });

        it('should handle tokens with extra claims', () => {
            const extraPayload = {
                ...testPayload,
                custom_claim: 'custom_value'
            };
            const tokenWithExtra = jwt.sign(extraPayload, secret, {
                algorithm: 'HS256'
            });

            const token = new Token(tokenWithExtra);
            expect(token.getValid()).toBe(true);
        });
    });
});
