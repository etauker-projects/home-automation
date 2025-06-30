import { TokenType } from '@etauker-projects/security-auth-api-client';
import { Role } from './role';

export class Token {

    constructor(private raw: TokenType) {

    }

    public getId(): string {
        return this.raw.id;
    }
    public getUserName(): string {
        return this.raw.user
    }
    public getSubject(): string {
        return this.raw.sub;
    }
    public getAudience(): string {
        return this.raw.aud;
    }
    public getIssuer(): string {
        return this.raw.iss;
    }
    public getFingerprint(): string {
        return this.raw.fingerprint;
    }
    public getIssuedAt(): number {
        return this.raw.iat;
    }
    public getExpiresAt(): number {
        return this.raw.exp;
    }
    public getRoles(): Role[] {
        return this.raw.roles.map(raw => new Role(raw));
    }

}