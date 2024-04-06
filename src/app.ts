import { DiskService } from './disk.service';
import { DirectoryService } from './directory.service';

const directories = [
    '/home/etauker',
    '/home/etauker/workspace',
    '/home/etauker/workspace/home-automation/data/glances',
    '/home/etauker/workspace/home-automation/data/grafana',
    '/home/etauker/workspace/home-automation/data/hass',
    '/home/etauker/workspace/home-automation/data/influxdb',
    '/home/etauker/workspace/home-automation/data/mosquitto',
    '/home/etauker/workspace/home-automation/data/zigbee2mqtt',
    // '/var/lib/docker',
];

const disk = new DiskService();
const directory = directories[0];
const diskSize = await disk.getTotalSpaceBytes(directory);
const diskUsed = await disk.getUsedSpaceBytes(directory);

console.log(`Total size: ${((diskSize / 1_000_000_000).toFixed(2))}GB`);
console.log(`Free space: ${((await disk.getFreeSpaceBytes(directory) / 1_000_000_000).toFixed(2))} GB (${((await disk.getFreeSpacePercentage(directory)).toFixed(2))}%)`);
// console.log(`Free space: ${((await disk.getFreeSpacePercentage(directory)).toFixed(2))}%`);
console.log(`Used space: ${((diskUsed / 1_000_000_000).toFixed(2))} GB (${((await disk.getUsedSpacePercentage(directory)).toFixed(2))}%)`);
// console.log(`Used space: ${((await disk.getUsedSpacePercentage(directory)).toFixed(2))}%`);
console.log();

const dirService = new DirectoryService();

directories.forEach(async dir => {
    const dirSize = await dirService.getSizeBytes(dir);

    console.log(`Size of directory '${dir}' = ${((dirSize / 1_000_000_000).toFixed(2))} GB (${ ((dirSize / diskUsed) * 100).toFixed(2) }% of total disk usage)`);
    // console.log(`Size of directory '${dir}' = ${((dirSize / 1_000_000_000).toFixed(2))}GB`);
    // console.log(`Size of directory '${dir}' = ${ ((dirSize / diskUsed) * 100).toFixed(2) }% of total disk usage`);
    // console.log(`Size of directory '${dir}' = ${ ((dirSize / diskSize) * 100).toFixed(2) }% of total disk space`);
})
// console.log(`Size of directory '${directories[1]}' = ${((await dir.getSizeBytes(directories[1(]) / 1_000_000_000) * 100).toFixed(2))}GB`);

// import { stat, statfs } from 'node:fs';

// // const pathsToCheck = ['./txtDir', './txtDir/file.txt'];

// for (let i = 0; i < directories.length; i++) {
//   stat(directories[i], (err, stats) => {
//     console.log(stats.isDirectory());
//     console.log(stats);
//   });

//   statfs(directories[i], (err, stats) => {
//     console.log(stats);
//   });
// }
