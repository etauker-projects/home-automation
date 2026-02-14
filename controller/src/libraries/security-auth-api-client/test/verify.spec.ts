// /* eslint-disable no-process-env */

// import assert from 'assert';
// import {  Session, SessionMock, User, UserMock } from '@etauker-projects/security-auth-api/src';
// import { PasswordManager } from '@etauker-projects/security-auth-api/src/passwords/password-manager';
// import { AuthClient } from '../src/auth.client';
// import { TestLogger } from '../src/test/test-logger';
// import { PersistenceConnectorMock } from '@etauker-projects/security-auth-api/src/test/persistence-connector.mock';
// import { randomUUID } from 'crypto';
// import { Config } from '../src/model/config.interface';

// describe('verify', () => {

//     const debug = false;
//     const mode = 'production';
//     const host = `http://host`;
//     const password = '12abCD?!';
//     const logger = new TestLogger(debug);
//     let user: User;
//     let hash: string;
//     let connector: PersistenceConnectorMock;
//     let session: Session;
//     let fingerprint: string;
//     const signingConfig: Config = {
//         secretKey: 'jdbfiuegufgeucjbekucguqegdmbufwegf83gukjbeubci8egq',
//         issuer: 'com.etauker.test.server',
//         audience: 'com.etauker.test',
//         algorithm: 'HS512',
//     }

//     beforeEach(async () => {
//         process.env.MODE = mode;
//         process.env.JWT_ENABLED = 'true';
//         process.env.LOGGER_LOG_LEVEL = debug ? 'ALL' : 'NONE';
//         process.env.JWT_SECRET = signingConfig.secretKey;
//         connector = PersistenceConnectorMock.getInstance();
//         hash = await new PasswordManager().hashPassword(password);
//         user = UserMock.generate(password, hash);
//         fingerprint = randomUUID(); // TODO: change to accept the full cookie
//         session = SessionMock.generate(connector, user, fingerprint, signingConfig);
//     });

//     it('valid token => should resolve', async () => {
//         const token = session.getTokenString();
//         const cookie = fingerprint;
//         const role = undefined;
//         const client = new AuthClient(host, mode, logger, signingConfig);
//         const result = await client.verify(token, cookie, role);
//         assert.equal(result, true, 'valid token should return true');
//     });

//     it('invalid token => should reject with "invalid token"', async () => {
//         const token = 'invalid token';
//         const cookie = fingerprint;
//         const role = undefined;
//         const client = new AuthClient(host, mode, logger, signingConfig);
//         const result = await client.verify(token, cookie, role);
//         assert.equal(result, false, 'valid token should return false');
//     });

//     it('missing token => should reject with "missing token"', async () => {
//         const token = undefined as any;
//         const cookie = fingerprint;
//         const role = undefined;
//         const client = new AuthClient(host, mode, logger, signingConfig);
//         const result = await client.verify(token, cookie, role);
//         assert.equal(result, false, 'valid token should return false');
//     });

//     it('missing fingerprint => should reject with "missing fingerprint"', async () => {
//         const token = session.getTokenString();
//         const cookie = undefined as any;
//         const role = undefined;
//         const client = new AuthClient(host, mode, logger, signingConfig);
//         const result = await client.verify(token, cookie, role);
//         assert.equal(result, false, 'valid token should return false');
//     });

//     it('missing permissions => should reject with "insufficient permissions"', async () => {
//         const token = session.getTokenString();
//         const cookie = fingerprint;
//         const role = 'com.etauker.test';
//         const client = new AuthClient(host, mode, logger, signingConfig);
//         const result = await client.verify(token, cookie, role);
//         assert.equal(result, false, 'valid token should return false');
//     });
// });
