import { DiskSpace } from 'check-disk-space';
import checkDiskSpace from 'check-disk-space';

export class DiskService {

    public async getTotalSpaceBytes(directory: string): Promise<number> {
        return (await this.findInfo(directory)).size;
    }

    public async getFreeSpaceBytes(directory: string): Promise<number> {
        return (await this.findInfo(directory)).free;
    }

    public async getFreeSpacePercentage(directory: string): Promise<number> {
        const info = await this.findInfo(directory);
        return (info.free / info.size) * 100;
    }

    public async getUsedSpaceBytes(directory: string): Promise<number> {
        const info = await this.findInfo(directory);
        return info.size - info.free;
    }

    public async getUsedSpacePercentage(directory: string): Promise<number> {
        const info = await this.findInfo(directory);
        const used = info.size - info.free;
        return (used / info.size) * 100;
    }

    private async findInfo(directory: string): Promise<DiskSpace> {
        return checkDiskSpace(directory);
    }
}