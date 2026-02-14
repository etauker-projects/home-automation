import jwt from 'jsonwebtoken';
import moment from 'moment';
import { TokenType } from './token.type.js';
import { Role } from './role.type.js';

// TODO: clean up
export class Token {

    // ===========================================
    //               PROPERTIES
    // ===========================================
    private token: TokenType = {
        id: '',
        sub: '',
        aud: '',
        iss: '',
        iat: 0,
        exp: 0,
        user: '',
        fingerprint: '',
        roles: []
        // extensions: []
    };
    private tokenString: string = null;
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

            this.token = {
                ...this.token,
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
            this.tokenString = token;
            this.valid = true;

        } catch (error) {
            this.token = null;
            this.tokenString = null;
            this.algorithm = '';
            this.signature = '';
            this.valid = false;
        }
    }

    // ===========================================
    //             GETTERS / SETTERS
    // ===========================================
    public getId(): string {
        return this.token.id;
    }
    public getUsername(): string {
        return this.token.user;
    }
    public getSubject(): string {
        return this.token.sub;
    }
    public getAudience(): string {
        return this.token.aud;
    }
    public getIssuer(): string {
        return this.token.iss;
    }
    public getIssuedAtTimestamp(): number {
        return this.token.iat;
    }
    public getIssuedAtString(): string {
        return Token.timestampToString(this.token.iat);
    }
    public getExpiryTimestamp(): number {
        return this.token.exp;
    }
    public getExpiryString(): string {
        return Token.timestampToString(this.token.exp);
    }
    public getFingerprint(): string {
        return this.token.fingerprint;
    }
    public getRoles(): Role[] {
        return this.token.roles;
    }
    public getRaw(): TokenType {
        return this.token;
    }
    public getTokenString(): string {
        return this.tokenString;
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
    private static timestampToString(timestamp: number): string {
        return moment.unix(timestamp).toISOString();
    }

    private static SUPPORTED_ALGORITHMS = [
        'HS256',
        'HS512'
    ];
}
