import fs from 'node:fs/promises';
import process from 'node:process';
import path from 'node:path';

// https://www.npmjs.com/package/yaml
import { parse } from 'yaml';


const id = 'plug_001';
const name = 'Plug 1';

const options = { encoding: 'utf-8'};
const templateDir = path.join(process.cwd(), 'templates', 'power-monitoring');
const templates = await fs.readdir(templateDir, options);
// console.log(templates);

templates.forEach(async templateFile => {
    console.log('---');
    let template = await fs.readFile(path.join(process.cwd(), 'templates', 'power-monitoring', templateFile), options);
    template = template.replaceAll('${id}', id);
    template = template.replaceAll('${name}', name);
    console.log('template:', parse(template));
});


// const history_stats = await fs.readFile(path.join(process.cwd(), 'test-data', 'power-monitoring', 'history_stats', `${id}.yaml`), options);
// console.log('history_stats:', parse(history_stats));

// const template_sensor = await fs.readFile(path.join(process.cwd(), 'test-data', 'power-monitoring', 'template_sensor', `${id}.yaml`), options);
// console.log('template_sensor:', parse(template_sensor));

// const utility_meter = await fs.readFile(path.join(process.cwd(), 'test-data', 'power-monitoring', 'utility_meter', `${id}.yaml`), options);
// console.log('utility_meter:', parse(utility_meter));



// 1. load templates
// 2. substitute variables
// 3. convert to yaml
// 4. save file

