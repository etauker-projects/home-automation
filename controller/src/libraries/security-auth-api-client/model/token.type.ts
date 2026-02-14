import { Role } from './role.type.js';

export type TokenType = {

    // Standard jwt claims
    id: string;     // jwt id = session id
    sub: string;
    iat: number;
    exp: number;
    aud: string;
    iss: string;

    // Custom jwt claims
    user: string;
    fingerprint: string;
    roles: Role[];
    // extensions
}
