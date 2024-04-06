export interface GetFolderSizeLib {
    // strict: (itemPath: string, options?: {
    //     ignore: RegExp,
    //     bigint: boolean,
    // }) => number | bigint;  // depending on bigint param

    // loose: (itemPath: string, options?: {
    //     ignore: RegExp,
    //     bigint: boolean,
    // }) => number | bigint;  // depending on bigint param

    strict: (itemPath: string, options?: {
        ignore?: RegExp,
        bigint?: boolean,
    }) => number;  // assuming bigint is false

    loose: (itemPath: string, options?: {
        ignore?: RegExp,
        bigint?: boolean,
    }) => number;  // assuming bigint is false
}
