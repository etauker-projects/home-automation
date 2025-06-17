// import { MqttConnector } from './mqtt/mqtt-connector.js';
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

// const host = process.env.MQTT_HOST;
// if (!host) {
//     throw new Error('Value not provided for MQTT_HOST');
// }

// const username = process.env.MQTT_USER;
// if (!username) {

//     throw new Error('Value not provided for MQTT_USER');
// }

// const password = process.env.MQTT_PASSWORD;
// if (!password) {
//     throw new Error('Value not provided for MQTT_PASSWORD');
// }

// const connector = new MqttConnector(host, username, password);
// const topic = 'etauker/home-automation';
// connector.subscribe(`${topic}/request`, (payload) => {
//     try {
//         const json = JSON.parse(payload);
//         console.log('Received json value:', json);

//         if (json.test === true) {
//             const response = { success: true };
//             console.log('Responding with a json object:', response);
//             connector.publish(`${topic}/response`, JSON.stringify(response));
//         } else {
//             const response = { success: true, reason: 'Testing disabled' };
//             console.log('Responding with a json object:', response);
//             connector.publish(`${topic}/response`, JSON.stringify(response));
//         }

//     } catch (error) {
//         console.error('Received non-json value:', payload);
//         const response = { success: true, reason: 'Non-json value received' };
//         console.log('Responding with a json object:', response);
//         connector.publish(`${topic}/response`, JSON.stringify(response));
//     }
// });

import { TemplateService } from './template/template.service';

// const templatingService = new TemplatingService();

// templatingService.loadModule('power_monitoring').then((result) => {
//     // console.log('Loaded template set:', result);
//     const replaced = templatingService.prepareTemplate(result.templates[0].content, {
//         MODULE: 'power_monitoring',
//         ID: 'office_desk_plug',
//         NAME: 'Office Desk Plug',
//     });
//     console.log('Replaced:', replaced);
// });


// export interface ModuleConfiguration {
//     id: string;
//     name: string;
//     description: string;
// }

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const appConfiguration = {
    inputDirectory: resolve(__dirname, '../templateSource'),
    outputDirectory: resolve(__dirname, '../templateDestination'),
};

const moduleConfiguration = {
    id: 'power_monitoring',
    name: 'Power Monitoring',
    description: 'Module for monitoring power consumption of devices',
};


export type AppConfiguration = typeof appConfiguration;
export type ModuleConfiguration = typeof moduleConfiguration;


const template = new TemplateService(appConfiguration);

template.loadModule(moduleConfiguration.id).then((result) => {
    console.log('Loaded template set:', result);
});