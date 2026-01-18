import { TokenAlgorithm } from './token-algorithm.type.js';

export interface Config {
    readonly enabled: boolean;
    readonly secretKey: string;
    readonly issuer: string;
    readonly audience: string;
    readonly algorithm: TokenAlgorithm;
    readonly expiresIn: number;
}