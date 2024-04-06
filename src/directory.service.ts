import getFolderSize from 'get-folder-size';
import { GetFolderSizeLib } from './get-folder-size';
const lib = getFolderSize as any as GetFolderSizeLib;

export class DirectoryService {
    // appoach 1
    // const size = await getFolderSize.loose(directory);
    // console.log(`The folder is ${size} bytes large`);
    // console.log(`That is the same as ${(size / 1000 / 1000).toFixed(2)} MB`);


    // appoach 2
    // command = 'sudo du -sh ${directory} | sort -h'

    public async getSizeBytes(directory: string): Promise<number> {
        return await lib.strict(directory, { bigint: false });
    }
}