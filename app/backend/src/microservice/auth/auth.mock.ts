import moment from 'moment';
import { AuthService, Token } from './auth.module';

export class AuthServiceMock {

    public realistic(): AuthService {
        return this as any as AuthService;
    }

    public verify(token: string, cookie: string, role?: string): Promise<boolean> {
        return Promise.resolve(true);
    }

    public decode(token: string): Token {
        return new Token({
            id: '0867ea8b-51cb-4d41-9c43-e2134737e3a7',
            sub: 'f6edd191-40d7-41d3-b347-9096b3ea9247',
            iat: moment.utc().subtract(1, 'minute').valueOf(),
            exp: moment.utc().add(1, 'hour').valueOf(),
            aud: 'dev.test',
            iss: 'dev.test',
            user: 'test-user',
            fingerprint: 'abc',
            roles: [],
        });
    }

    public getCookieName(): string {
        return 'yum-yum';
    }

}