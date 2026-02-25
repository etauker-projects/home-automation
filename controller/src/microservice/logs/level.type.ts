/* eslint-disable no-shadow */
export const values = {
    OFF: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    CONFIG: 4,
    DEBUG: 5,
    TRACE: 6,
    ALL: 7
} as const;

/**
 * The degree to which the logger may be enabled.
 */
export type Level = keyof typeof values;
