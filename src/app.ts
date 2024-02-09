import { DiskService } from './disk.service';

const directories = [
    '/home/etauker',
    // '/var/lib/*',
];

const disk = new DiskService();
const directory = directories[0];

console.log(`Total size: ${((await disk.getTotalSpaceBytes(directory) / 1_000_000_000).toFixed(2))}GB`);
console.log(`Free space: ${((await disk.getFreeSpaceBytes(directory) / 1_000_000_000).toFixed(2))}GB`);
console.log(`Free space: ${((await disk.getFreeSpacePercentage(directory)).toFixed(2))}%`);
console.log(`Used space: ${((await disk.getUsedSpaceBytes(directory) / 1_000_000_000).toFixed(2))}GB`);
console.log(`Used space: ${((await disk.getUsedSpacePercentage(directory)).toFixed(2))}%`);