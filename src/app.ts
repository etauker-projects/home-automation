import { DockerConnector } from './docker/docker-connector.js';

// import { DiskService } from './disk.service';


// const directories = [
//     '/home/etauker',
//     // '/var/lib/*',
// ];

// const disk = new DiskService();
// const directory = directories[0];

// console.log(`Total size: ${((await disk.getTotalSpaceBytes(directory) / 1_000_000_000).toFixed(2))}GB`);
// console.log(`Free space: ${((await disk.getFreeSpaceBytes(directory) / 1_000_000_000).toFixed(2))}GB`);
// console.log(`Free space: ${((await disk.getFreeSpacePercentage(directory)).toFixed(2))}%`);
// console.log(`Used space: ${((await disk.getUsedSpaceBytes(directory) / 1_000_000_000).toFixed(2))}GB`);
// console.log(`Used space: ${((await disk.getUsedSpacePercentage(directory)).toFixed(2))}%`);

const host = process.env.MQTT_HOST;
if (!host) {
    throw new Error('Value not provided for MQTT_HOST');
}

const username = process.env.MQTT_USER;
if (!username) {
    throw new Error('Value not provided for MQTT_USER');
}

const password = process.env.MQTT_PASSWORD;
if (!password) {
    throw new Error('Value not provided for MQTT_PASSWORD');
}

const connector = new MqttConnector(host, username, password);
const topic = 'etauker/home-automation';
connector.subscribe(`${topic}/request`, (payload) => {
    try {
        const json = JSON.parse(payload);
        console.log('Received json value:', json);

        if (json.test === true) {
            const response = { success: true };
            console.log('Responding with a json object:', response);
            connector.publish(`${topic}/response`, JSON.stringify(response));
        } else {
            const response = { success: true, reason: 'Testing disabled' };
            console.log('Responding with a json object:', response);
            connector.publish(`${topic}/response`, JSON.stringify(response));
        }

const docker = new DockerConnector();
docker.showDockerContainers();