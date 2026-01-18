import jwt from 'jsonwebtoken';
import moment from 'moment';
import { TokenType } from './token.type.js';

export class Token {

    // ===========================================
    //               PROPERTIES
    // ===========================================
    private securityJwtToken: TokenType | null = {
        id: '',
        sub: '',
        aud: '',
        iss: '',
        iat: 0,
        exp: 0,
        user: '',
        fingerprint: '',
        // roles: []
        // extensions: []
    };
    private securityJwtTokenString: string | null = null;
    private algorithm: string = '';
    private signature: string = '';
    private valid: boolean = false;

    // ===========================================
    //               CONSTRUCTOR
    // ===========================================
    constructor(token: string) {

        try {
            const options = { complete: true };
            const decoded = jwt.decode(token, options) as jwt.JwtPayload;
            const payload: TokenType = decoded.payload as TokenType;

            this.securityJwtToken = {
                ...this.securityJwtToken,
                ...payload,
                // ...{ roles: payload && payload.roles ? payload.roles.map(SecurityJwtToken.parseRolesForClient) : [] }
            };

            this.algorithm = (decoded.header && decoded.header.alg) ? decoded.header.alg : '';

            /*
            *   Prevention for "none" hashing algorithm vulnerability
            *   https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/JSON_Web_Token_Cheat_Sheet_for_Java.md#none-hashing-algorithm
            *   https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/#Meet-the--none--algorithm
            */
            const algo = this.algorithm.toUpperCase();
            if (!Token.SUPPORTED_ALGORITHMS.includes(algo)) {
                throw new Error('Algorithm not supported');
            }

            this.signature = decoded.signature;
            this.securityJwtTokenString = token;
            this.valid = true;

        } catch (error) {
            this.securityJwtToken = null;
            this.securityJwtTokenString = null;
            this.algorithm = '';
            this.signature = '';
            this.valid = false;
        }
    }

    // ===========================================
    //             GETTERS / SETTERS
    // ===========================================
    public getId(): string {
        if (!this.securityJwtToken) {
            throw new Error('Token is invalid');
        }
        return this.securityJwtToken.id;
    }
    public getUsername(): string {
        if (!this.securityJwtToken) {
            throw new Error('Token is invalid');
        }
        return this.securityJwtToken.user;
    }
    public getSubject(): string {
        if (!this.securityJwtToken) {
            throw new Error('Token is invalid');
        }
        return this.securityJwtToken.sub;
    }
    public getAudience(): string {
        if (!this.securityJwtToken) {
            throw new Error('Token is invalid');
        }
        return this.securityJwtToken.aud;
    }
    public getIssuer(): string {
        if (!this.securityJwtToken) {
            throw new Error('Token is invalid');
        }
        return this.securityJwtToken.iss;
    }
    public getIssuedAtTimestamp(): number {
        if (!this.securityJwtToken) {
            throw new Error('Token is invalid');
        }
        return this.securityJwtToken.iat;
    }
    public getIssuedAtString(): string {
        if (!this.securityJwtToken) {
            throw new Error('Token is invalid');
        }
        return Token.timestampToString(this.securityJwtToken.iat);
    }
    public getExpiryTimestamp(): number {
        if (!this.securityJwtToken) {
            throw new Error('Token is invalid');
        }
        return this.securityJwtToken.exp;
    }
    public getExpiryString(): string {
        if (!this.securityJwtToken) {
            throw new Error('Token is invalid');
        }
        return Token.timestampToString(this.securityJwtToken.exp);
    }
    public getFingerprint(): string {
        if (!this.securityJwtToken) {
            throw new Error('Token is invalid');
        }
        return this.securityJwtToken.fingerprint;
    }
    // public getRoles(): SecurityRoleType[] {
    //     return this.securityJwtToken.roles;
    // }
    public getRaw(): TokenType {
        if (!this.securityJwtToken) {
            throw new Error('Token is invalid');
        }
        return this.securityJwtToken;
    }
    public getTokenString(): string {
        return this.securityJwtTokenString || '';
    }
    public getAlgorithm(): string {
        return this.algorithm;
    }
    public getSignature(): string {
        return this.signature;
    }
    public getValid(): boolean {
        return this.valid;
    }
    public setValid(valid: boolean): Token {
        this.valid = valid;
        return this;
    }

    // ===========================================
    //             PRIVATE FUNCTIONS
    // ===========================================
    // private static dateToString(date: Date): string {
    //     return new utils.DateWrapper(date).getUtcString();
    // }
    private static timestampToString(timestamp: number): string {
        return moment.unix(timestamp).toISOString();
    }
    // private static parseRolesForClient(originalRole: SecurityRoleType): SecurityRoleType {

    //     const propertiesToRemove = [
    //         'created_at',
    //         'created_by',
    //         'updated_at',
    //         'updated_by'
    //     ];

    //     const newRole = Object.keys(originalRole).reduce((role, propertyKey) => {
    //       if (!propertiesToRemove.includes(propertyKey)) {
    //         role[propertyKey] = originalRole[propertyKey];
    //       }
    //       return role
    //   }, {}) as SecurityRoleType;

    //   return newRole;
    // }
    private static SUPPORTED_ALGORITHMS = [
        'HS256',
        'HS512'
    ];
}
