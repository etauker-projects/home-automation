// import type { Dependencies, DiskSpace } from 'check-disk-space';
// export { Dependencies, DiskSpace };

declare module 'check-disk-space' {
    export type DiskSpace = {
        diskPath: string;
        free: number;
        size: number;
    };
    export default function checkDiskSpace(directoryPath: string): Promise<DiskSpace>;
    // export * from 'check-disk-space';
//     export default function checkDiskSpace (itemPath, options): Promise<{size: number | bigint, errors: Array<Error> | null}>;
//     export function loose (itemPath: string, options?): any;
//     export function strict (itemPath: string, options?): any;
//     // getFolderSize.strict = async (itemPath, options) =>
}

// declare global {
//     namespace Application.Administration {
//         export import Users = users;
//     }
// }