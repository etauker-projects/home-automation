import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenFactory } from './token.factory.js';
import { TokenService } from './token.service.js';
import { Config } from './config.interface.js';

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

vi.mock('../environment/extractor.js', () => ({
    Extractor: {
        extractBoolean: vi.fn((name: string, fallback?: boolean) => {
            const env = process.env[name];
            if (env?.toLowerCase() === 'true') return true;
            if (env?.toLowerCase() === 'false') return false;
            if (fallback !== undefined) return fallback;
            throw new Error(`Environment variable '${name}' not set`);
        }),
        extractString: vi.fn((name: string, fallback?: string) => {
            const value = process.env[name];
            if (value) return value;
            if (fallback !== undefined) return fallback;
            throw new Error(`Environment variable '${name}' not set`);
        }),
        extractNumber: vi.fn((name: string, fallback?: number) => {
            const value = process.env[name];
            const isNumber = value !== undefined && !isNaN(value as any);
            if (isNumber && value !== undefined) return parseInt(value);
            if (fallback !== undefined) return fallback;
            throw new Error(`Environment variable '${name}' not set`);
        }),
        extractEnum: vi.fn((name: string, options: string[], fallback?: string) => {
            const value = process.env[name]?.toUpperCase();
            if (value && options.includes(value)) return value;
            if (fallback !== undefined) return fallback;
            throw new Error(`Environment variable '${name}' not set`);
        }),
    }
}));

describe('TokenFactory', () => {
    const mockConnector = {} as any;
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset environment
        process.env = { ...originalEnv };
        // Set JWT_SECRET which is required
        process.env.JWT_SECRET = 'test-secret-key';
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.clearAllMocks();
    });

    describe('makeConfig', () => {
        it('should create config with default values', () => {
            const config = TokenFactory.makeConfig();
            expect(config).toBeDefined();
            expect(config.enabled).toBe(true);
            expect(config.issuer).toBe('com.etauker.login');
            expect(config.audience).toBe('com.etauker.production');
            expect(config.algorithm).toBe('HS512');
            expect(config.expiresIn).toBe(60 * 60);
        });

        it('should extract secretKey from environment', () => {
            process.env.JWT_SECRET = 'my-secret-key';
            const config = TokenFactory.makeConfig();
            expect(config.secretKey).toBe('my-secret-key');
        });

        it('should extract JWT_ENABLED from environment', () => {
            process.env.JWT_ENABLED = 'false';
            const config = TokenFactory.makeConfig();
            expect(config.enabled).toBe(false);
        });

        it('should use default true for JWT_ENABLED if not set', () => {
            delete process.env.JWT_ENABLED;
            const config = TokenFactory.makeConfig();
            expect(config.enabled).toBe(true);
        });

        it('should extract JWT_ISSUER from environment', () => {
            process.env.JWT_ISSUER = 'custom-issuer';
            const config = TokenFactory.makeConfig();
            expect(config.issuer).toBe('custom-issuer');
        });

        it('should use default issuer if not set', () => {
            delete process.env.JWT_ISSUER;
            const config = TokenFactory.makeConfig();
            expect(config.issuer).toBe('com.etauker.login');
        });

        it('should extract JWT_AUDIENCE from environment', () => {
            process.env.JWT_AUDIENCE = 'custom-audience';
            const config = TokenFactory.makeConfig();
            expect(config.audience).toBe('custom-audience');
        });

        it('should use default audience if not set', () => {
            delete process.env.JWT_AUDIENCE;
            const config = TokenFactory.makeConfig();
            expect(config.audience).toBe('com.etauker.production');
        });

        it('should extract JWT_ALGORITHM from environment', () => {
            process.env.JWT_ALGORITHM = 'hs256';
            const config = TokenFactory.makeConfig();
            expect(config.algorithm).toBe('HS256');
        });

        it('should use default algorithm HS512 if not set', () => {
            delete process.env.JWT_ALGORITHM;
            const config = TokenFactory.makeConfig();
            expect(config.algorithm).toBe('HS512');
        });

        it('should accept HS256 algorithm', () => {
            process.env.JWT_ALGORITHM = 'HS256';
            const config = TokenFactory.makeConfig();
            expect(config.algorithm).toBe('HS256');
        });

        it('should accept HS512 algorithm', () => {
            process.env.JWT_ALGORITHM = 'HS512';
            const config = TokenFactory.makeConfig();
            expect(config.algorithm).toBe('HS512');
        });

        it('should extract JWT_EXPIRES_IN from environment', () => {
            process.env.JWT_EXPIRES_IN = '7200';
            const config = TokenFactory.makeConfig();
            expect(config.expiresIn).toBe(7200);
        });

        it('should use default expiresIn if not set', () => {
            delete process.env.JWT_EXPIRES_IN;
            const config = TokenFactory.makeConfig();
            expect(config.expiresIn).toBe(60 * 60);
        });

        it('should allow overriding enabled', () => {
            const config = TokenFactory.makeConfig({ enabled: false });
            expect(config.enabled).toBe(false);
        });

        it('should allow overriding secretKey', () => {
            const config = TokenFactory.makeConfig({ secretKey: 'override-secret' });
            expect(config.secretKey).toBe('override-secret');
        });

        it('should allow overriding issuer', () => {
            const config = TokenFactory.makeConfig({ issuer: 'override-issuer' });
            expect(config.issuer).toBe('override-issuer');
        });

        it('should allow overriding audience', () => {
            const config = TokenFactory.makeConfig({ audience: 'override-audience' });
            expect(config.audience).toBe('override-audience');
        });

        it('should allow overriding algorithm', () => {
            const config = TokenFactory.makeConfig({ algorithm: 'HS256' });
            expect(config.algorithm).toBe('HS256');
        });

        it('should allow overriding expiresIn', () => {
            const config = TokenFactory.makeConfig({ expiresIn: 1800 });
            expect(config.expiresIn).toBe(1800);
        });

        it('should merge multiple overrides', () => {
            const config = TokenFactory.makeConfig({
                enabled: false,
                issuer: 'custom-issuer',
                algorithm: 'HS256',
                expiresIn: 900
            });
            expect(config.enabled).toBe(false);
            expect(config.issuer).toBe('custom-issuer');
            expect(config.algorithm).toBe('HS256');
            expect(config.expiresIn).toBe(900);
            expect(config.audience).toBe('com.etauker.production'); // Not overridden
        });

        it('should return a valid Config object', () => {
            const config = TokenFactory.makeConfig();
            expect(config).toHaveProperty('enabled');
            expect(config).toHaveProperty('secretKey');
            expect(config).toHaveProperty('issuer');
            expect(config).toHaveProperty('audience');
            expect(config).toHaveProperty('algorithm');
            expect(config).toHaveProperty('expiresIn');
        });

        it('should create config from environment with all values set', () => {
            process.env.JWT_ENABLED = 'true';
            process.env.JWT_SECRET = 'env-secret';
            process.env.JWT_ISSUER = 'env-issuer';
            process.env.JWT_AUDIENCE = 'env-audience';
            process.env.JWT_ALGORITHM = 'HS256';
            process.env.JWT_EXPIRES_IN = '5400';

            const config = TokenFactory.makeConfig();
            expect(config.enabled).toBe(true);
            expect(config.secretKey).toBe('env-secret');
            expect(config.issuer).toBe('env-issuer');
            expect(config.audience).toBe('env-audience');
            expect(config.algorithm).toBe('HS256');
            expect(config.expiresIn).toBe(5400);
        });
    });

    describe('makeService', () => {
        beforeEach(() => {
            process.env.JWT_SECRET = 'test-secret';
        });

        it('should create a TokenService instance', () => {
            const service = TokenFactory.makeService(mockConnector);
            expect(service).toBeInstanceOf(TokenService);
        });

        it('should create TokenService with default config', () => {
            const service = TokenFactory.makeService(mockConnector);
            expect(service.isEnabled()).toBe(true);
        });

        it('should create TokenService with overridden config', () => {
            const service = TokenFactory.makeService(mockConnector, { enabled: false });
            expect(service.isEnabled()).toBe(false);
        });

        it('should pass connector to TokenService', () => {
            const customConnector = { custom: 'connector' } as any;
            const service = TokenFactory.makeService(customConnector);
            expect(service).toBeInstanceOf(TokenService);
        });

        it('should create multiple independent services', () => {
            const service1 = TokenFactory.makeService(mockConnector);
            const service2 = TokenFactory.makeService(mockConnector);
            expect(service1).not.toBe(service2);
            expect(service1.getSecret()).toBe(service2.getSecret());
        });

        it('should create services with different configurations', () => {
            const service1 = TokenFactory.makeService(mockConnector, { expiresIn: 1800 });
            const service2 = TokenFactory.makeService(mockConnector, { expiresIn: 3600 });
            expect(service1).toBeInstanceOf(TokenService);
            expect(service2).toBeInstanceOf(TokenService);
        });

        it('should handle environment variables when creating service', () => {
            process.env.JWT_ENABLED = 'false';
            process.env.JWT_ALGORITHM = 'HS256';

            const service = TokenFactory.makeService(mockConnector);
            expect(service.isEnabled()).toBe(false);
        });

        it('should merge overrides with environment-based config', () => {
            process.env.JWT_ALGORITHM = 'HS256';
            const service = TokenFactory.makeService(mockConnector, { expiresIn: 1200 });
            expect(service).toBeInstanceOf(TokenService);
        });

        it('should create service that can generate tokens', () => {
            const service = TokenFactory.makeService(mockConnector);
            expect(service.isEnabled()).toBe(true);
            expect(typeof service.generateTokenSync).toBe('function');
        });

        it('should return TokenService with all expected methods', () => {
            const service = TokenFactory.makeService(mockConnector);
            expect(typeof service.isEnabled).toBe('function');
            expect(typeof service.generateToken).toBe('function');
            expect(typeof service.generateTokenSync).toBe('function');
            expect(typeof service.decodeToken).toBe('function');
            expect(typeof service.verifyToken).toBe('function');
            expect(typeof service.getFingerprintHash).toBe('function');
            expect(typeof service.getSecret).toBe('function');
        });
    });

    describe('integration scenarios', () => {
        beforeEach(() => {
            process.env.JWT_SECRET = 'integration-test-secret';
        });

        it('should create production configuration', () => {
            process.env.JWT_ENABLED = 'true';
            process.env.JWT_ALGORITHM = 'HS512';
            process.env.JWT_EXPIRES_IN = '86400';

            const config = TokenFactory.makeConfig();
            expect(config.enabled).toBe(true);
            expect(config.algorithm).toBe('HS512');
            expect(config.expiresIn).toBe(86400);
        });

        it('should create development configuration', () => {
            const config = TokenFactory.makeConfig({ enabled: false, expiresIn: 3600 });
            expect(config.enabled).toBe(false);
            expect(config.expiresIn).toBe(3600);
        });

        it('should create custom configuration', () => {
            const customConfig = TokenFactory.makeConfig({
                issuer: 'my-app',
                audience: 'my-users',
                algorithm: 'HS256',
                expiresIn: 7200
            });
            expect(customConfig.issuer).toBe('my-app');
            expect(customConfig.audience).toBe('my-users');
            expect(customConfig.algorithm).toBe('HS256');
            expect(customConfig.expiresIn).toBe(7200);
        });

        it('should factory pattern maintains consistency', () => {
            const config1 = TokenFactory.makeConfig();
            const config2 = TokenFactory.makeConfig();
            expect(config1.issuer).toBe(config2.issuer);
            expect(config1.audience).toBe(config2.audience);
            expect(config1.algorithm).toBe(config2.algorithm);
            expect(config1.expiresIn).toBe(config2.expiresIn);
        });

        it('should support environment-based and override-based configuration together', () => {
            process.env.JWT_ISSUER = 'env-issuer';
            process.env.JWT_ALGORITHM = 'HS256';

            const config = TokenFactory.makeConfig({
                audience: 'override-audience',
                expiresIn: 1800
            });

            expect(config.issuer).toBe('env-issuer');
            expect(config.algorithm).toBe('HS256');
            expect(config.audience).toBe('override-audience');
            expect(config.expiresIn).toBe(1800);
        });
    });
});
