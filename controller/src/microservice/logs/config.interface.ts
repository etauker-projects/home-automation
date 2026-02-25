import { Level } from './level.type.js';
import { Format } from './format.type.js';

export interface Config {
    readonly coloursEnabled: boolean;
    readonly logLevel: Level;
    readonly outputFormat: Format;
}