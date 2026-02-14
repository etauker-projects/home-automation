import { TokenAlgorithm } from './token-algorithm.type.js';

// TODO: consider renaming
export interface Config {
    readonly secretKey: string;
    readonly issuer: string;
    readonly audience: string;
    readonly algorithm: TokenAlgorithm;
}