const title: String = 'Web Components Server';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// import path from 'path';
import { readdir, readFile } from 'fs/promises';
import { resolve } from 'path';

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// const readFile = (path: string) => {

// }

const debugLog = (debug: boolean, text: string, value: any) => {
    if (debug) {
        console.log(text, value);
    }
};

app.get('/data/:metric/:year', async (req, res) => {
    // aggregationPeriod: hourly, daily, monthly
    // metric: running_cost, energy_usage
    const { metric, year } = req.params;
    const { month, day } = req.query;
    const debug = true;

    debugLog(debug, 'Received request for data:', { metric, year, month, day });
    const basepath = resolve(`./data/processed`);

    if (month === undefined) {
        const aggregationPeriod = 'monthly';
        const regexString = `${year}\.${metric}\.${aggregationPeriod}\.json`;
        debugLog(debug, 'regexString', regexString);
        const regex = new RegExp(regexString);
        const files = await readdir(basepath);
        debugLog(debug, 'files', files);
        const filepaths = files.filter(file => regex.test(file));
        debugLog(debug, 'filepaths', filepaths);

        const promises = filepaths.map(filepath => {
            debugLog(debug, 'reading file', resolve(basepath, filepath));
            return readFile(resolve(basepath, filepath), 'utf-8').then(contents => {
                return JSON.parse(contents);
            });
        });

        const results = (await Promise.all(promises)).flat();
        debugLog(debug, 'results', results.length);
        res.json({ results });

    } else if (day === undefined) {
        const aggregationPeriod = 'daily';
        const regexString = `${year}-${month}\.${metric}\.${aggregationPeriod}\.json`;
        debugLog(debug, 'regexString', regexString);
        const regex = new RegExp(regexString);
        const files = await readdir(basepath);
        debugLog(debug, 'files', files);
        const filepaths = files.filter(file => regex.test(file));
        debugLog(debug, 'filepaths', filepaths);

        const promises = filepaths.map(filepath => {
            debugLog(debug, 'reading file', resolve(basepath, filepath));
            return readFile(resolve(basepath, filepath), 'utf-8').then(contents => {
                return JSON.parse(contents);
            });
        });

        const results = (await Promise.all(promises)).flat();
        debugLog(debug, 'results', results.length);
        res.json({ results });

    } else {
        const aggregationPeriod = 'hourly';
        const filepath = resolve(`./data/processed/${year}-${month}-${day}.${metric}.${aggregationPeriod}.json`);
        const data = await readFile(filepath, 'utf-8');
        const results = JSON.parse(data);
        debugLog(debug, 'results', results.length);
        res.json({ results });
    }
});


app.listen(port, () => {
    console.log(`${title} is running at http://localhost:${port}`);
});