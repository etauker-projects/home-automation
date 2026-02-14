// /* eslint-disable no-process-env */
// import assert from 'assert';
// import { AuthServer, SessionMapper, SessionMock, User, UserMapper, UserMock } from '@etauker-projects/security-auth-api/src';
// import { AuthClient } from '../auth.client.js';
// import { TestLogger } from '../test/test-logger.js';
// import { Config } from '../model/config.interface.js';

// // TODO: export from @etauker-projects/security-auth-api/src
// import { PersistenceConnectorMock } from '@etauker-projects/security-auth-api/src/test/persistence-connector.mock';
// import { PasswordManager } from '@etauker-projects/security-auth-api/src/passwords/password-manager';

// describe('login', () => {

//     const debug = false;
//     const port = 9000;
//     const mode = 'production';
//     const host = `http://localhost:${port}`;
//     const password = '12abCD?!';
//     const passwordBase64 = Buffer.from(password).toString('base64');
//     const logger = new TestLogger(debug);
//     let user: User;
//     let hash: string;
//     let server: AuthServer;
//     let connector: PersistenceConnectorMock;
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
//         process.env.JWT_SECRET = 'jdbfiuegufgeucjbekucguqegdmbufwegf83gukjbeubci8egq';
//         connector = PersistenceConnectorMock.getInstance();
//         server = new AuthServer(port).connector(connector.realistic()).silent().start();
//         hash = await new PasswordManager().hashPassword(password);
//         user = UserMock.generate(password, hash);
//     });

//     afterEach(() => {
//         server.stop();
//         connector.reset();
//     });

//     it('success => should resolve with correct data', async () => {
//         const session = SessionMock.generate(connector, user, 'abcd', signingConfig);
//         connector.continueWith([ UserMapper.toDso(user) ]);
//         connector.continueWithFull(1);
//         connector.continueWith([ SessionMapper.toDso(session) ]);

//         const client = new AuthClient(host, mode, logger, signingConfig);
//         const result = await client.login(user.getUsername(), passwordBase64);
//         assert.equal(result.userId, user.getId(), 'incorrect user id');
//         assert.equal(result.userName, user.getUsername(), 'incorrect user name');
//         assert.equal(result.sessionId, session.getId(), 'incorrect session id');
//         assert.equal(result.loggedIn, true, 'incorrect logged in value');
//     });

//     it('incorrect username => should reject with "incorrect credentials" error', (done) => {
//         const session = SessionMock.generate(connector, user, 'abcd', signingConfig);
//         connector.continueWith([]);
//         connector.continueWithFull(1);
//         connector.continueWith([ SessionMapper.toDso(session) ]);

//         const client = new AuthClient(host, mode, logger, signingConfig);
//         client.login('incorrect-username', password)
//             .then(() => done('Error should have been thrown'))
//             .catch(error => {
//                 assert.equal(error.message, 'Incorrect credentials provided', 'incorrect error message');
//                 done();
//             })
//         ;
//     });

//     it('incorrect password => should reject with "incorrect credentials" error', (done) => {
//         const session = SessionMock.generate(connector, user, 'abcd', signingConfig);
//         connector.continueWith([ UserMapper.toDso(user) ]);
//         connector.continueWithFull(1);
//         connector.continueWith([ SessionMapper.toDso(session) ]);

//         const client = new AuthClient(host, mode, logger, signingConfig);
//         client.login(user.getUsername(), 'incorrect password')
//             .then(() => done('Error should have been thrown'))
//             .catch(error => {
//                 assert.equal(error.message, 'Incorrect credentials provided', 'incorrect error message');
//                 done();
//             })
//         ;
//     });

//     it('unencoded password => should reject with "incorrect credentials" error', (done) => {
//         const session = SessionMock.generate(connector, user, 'abcd', signingConfig);
//         connector.continueWith([]);
//         connector.continueWithFull(1);
//         connector.continueWith([ SessionMapper.toDso(session) ]);

//         const client = new AuthClient(host, mode, logger, signingConfig);
//         client.login(user.getUsername(), password)
//             .then(() => done('Error should have been thrown'))
//             .catch(error => {
//                 assert.equal(error.message, 'Incorrect credentials provided', 'incorrect error message');
//                 done();
//             })
//         ;
//     });
// });
