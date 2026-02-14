// /* eslint-disable no-process-env */
// import assert from 'assert';
// import { randomUUID } from 'crypto';
// import { AuthClient } from '../src/auth.client';
// import { TestLogger } from '../src/test/test-logger';
// import { AuthServer, SessionMapper, SessionMock, User, UserMock } from '@etauker-projects/security-auth-api/src';
// import { PersistenceConnectorMock } from '@etauker-projects/security-auth-api/src/test/persistence-connector.mock';
// import { PasswordManager } from '@etauker-projects/security-auth-api/src/passwords/password-manager';
// import { Config } from '../src/model/config.interface';

// describe('logout', () => {

//     const debug = false;
//     const mode = 'production';
//     const port = 9000;
//     const host = `http://localhost:${port}`;
//     const password = '12abCD?!';
//     const logger = new TestLogger(debug);
//     let user: User;
//     let hash: string;
//     let server: AuthServer;
//     let connector: PersistenceConnectorMock;
//     let signingConfig: Config = {
//         secretKey: 'jdbfiuegufgeucjbekucguqegdmbufwegf83gukjbeubci8egq',
//         issuer: 'com.etauker.test.server',
//         audience: 'com.etauker.test',
//         algorithm: 'HS512',
//     };

//     beforeEach(async () => {
//         process.env.MODE = mode;
//         process.env.JWT_ENABLED = 'true';
//         process.env.LOGGER_LOG_LEVEL = debug ? 'ALL' : 'NONE';
//         process.env.JWT_SECRET = signingConfig.secretKey;
//         process.env.JWT_ISSUER = signingConfig.issuer;
//         process.env.JWT_AUDIENCE = signingConfig.audience;
//         process.env.JWT_ALGORITHM = signingConfig.algorithm;
//         connector = PersistenceConnectorMock.getInstance();
//         server = new AuthServer(port).connector(connector.realistic()).silent().start();
//         hash = await new PasswordManager().hashPassword(password);
//         user = UserMock.generate(password, hash);
//     });

//     afterEach(() => {
//         server.stop();
//         connector.reset();
//     });

//     it('success => should resolve on logout', async () => {
//         const fingerprint = randomUUID(); // TODO: change to accept the full cookie
//         const session = SessionMock.generate(connector, user, fingerprint, signingConfig);
//         connector.continueWithFull(0, 1);
//         connector.continueWith([ SessionMapper.toDso(session) ]);

//         const client = new AuthClient(host, mode, logger, signingConfig);
//         const result = await client.logout(session.getTokenString(), fingerprint);
//         assert.equal(result.userId, user.getId(), 'incorrect user id');
//         assert.equal(result.userName, user.getUsername(), 'incorrect user name');
//         assert.equal(result.sessionId, session.getId(), 'incorrect session id');
//         assert.equal(result.loggedIn, false, 'incorrect logged in value');
//     });
// });
