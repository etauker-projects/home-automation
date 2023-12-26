import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import moment from 'moment';

import {
    Alarm,
    AlarmType,
    BloodGlucose,
    Bolus,
    Mapped,
    Meal,
    SensorException,
    SensorExceptionType,
    SensorReading,
    TempBasal,
    Types,
    parse,
} from './model/schema';

import { mapLinesToJsonArray  } from './mapToJson';


const logger = {
    info: (...params: any[]) => {
        console.log('[INFO]', ...params);
    },
    warn: (...params: any[]) => {
        console.warn('[WARNING]', ...params);
    },
    debug: (...params: any[]) => {
        console.log('[DEBUG]', ...params);
    },
    trace: (...params: any[]) => {
        // console.log('[TRACE]', ...params);
    },
}

const loadFileContent = (filename: string): Promise<string> => {
    const p = path.resolve('data', filename);
    return fs.readFile(p, { encoding: 'utf-8' });
};
const saveFileContent = (filename: string, data: string): Promise<void> => {
    const p = path.resolve('output', filename);
    return fs.writeFile(p, data, { encoding: 'utf-8' });
};

const preProcess = (content: string, expectedColumns: number): string => {
    let lines = content.split(os.EOL);
    logger.info('original file lines:', lines.length);

    lines = lines.map(line => line.replace('\r', ''));
    lines = lines.map(line => {
        // replace commas inside of a quoted value with a ' - '
        const match = line.replaceAll('","', '').match(/\"((.*?),(.*?))\"/g);
        if (match) {
            return line.replaceAll(match[0], match[0].replace(', ', ' - '));
        } else {
            return line;
        }
    });

    lines = lines.filter(line => {
        // ignore lines with incorrect number of columns
        const expectedCommas = expectedColumns - 1;
        const commas = (line.match(/,/g) || []).length;
        if (commas !== expectedCommas) {
            logger.debug('incorrect column count:', commas, line);
        }
        return commas === expectedCommas;
    });

    const headers = lines[0];
    lines = lines.filter(line => {
        return line !== headers;
    })

    logger.info('pre-processed lines (exc. header):', lines.length);

    return Array.of(headers).concat(lines).join(os.EOL);
};

const split = (content: string): { headers: string[], lines: string[] } => {
    const lines = content.split(os.EOL)
        .map(line => line.replace('\r', '').replaceAll(`"`, ''))
        .filter(line => line)
    ;

    const headers = lines.splice(0, 1)[0]
        .split(',')
        .map(header => header.replaceAll(' ', '_').toLowerCase())
    ;

    return { headers, lines };
};

const formatTimestamp = (date: string, time: string, obj: any): number => {

    try {
        const result = moment.utc(`${date.replaceAll('/', '-')}T${time}`, true);

        if (!result.isValid()) {
            console.error(`${date.replaceAll('/', '-')}T${time}`, obj);
        }

    } catch (e) {
        console.error(e);
    }

    return moment.utc(`${date.replaceAll('/', '-')}T${time}`).valueOf();
}

const mapToOutputLines = (array: Mapped[]): string[] => {
    const lines = array.map((json) => {

        if ((json.type as Types) === 'ALARM') {
            const obj = json as Alarm;

            if ((obj.alarm as AlarmType) === 'ALERT ON LOW') {
                const timestamp = formatTimestamp(obj.date, obj.time, obj);
                const line = `low_glucose_alarm value=1i ${timestamp}`;
                logger.trace(line);
                return line;
            }

            // if ((obj.alarm as AlarmType) === 'CHANGE SENSOR') {
            //     const timestamp = formatTimestamp(obj.date, obj.time, obj);
            //     const line = `glucose_sensor_ended value=1i ${timestamp}`;
            //     logger.trace(line);
            //     return line;
            // }

            // if ((obj.alarm as AlarmType) === 'SMARTGUARD EXIT') {
            //     const timestamp = formatTimestamp(obj.date, obj.time, obj);
            //     const line = `smartguard_exit value=1i ${timestamp}`;
            //     logger.trace(line);
            //     return line;
            // }
        }

        if ((json.type as Types) === 'BLOOD_GLUCOSE') {
            const obj = json as BloodGlucose;
            const timestamp = formatTimestamp(obj.date, obj.time, obj);
            const line = `blood_glucose_level value=${obj['bg_reading_(mmol/l)']} ${timestamp}`;
            logger.trace(line);
            return line;
        }

        if ((json.type as Types) === 'BOLUS') {
            const obj = json as Bolus;
            const timestamp = formatTimestamp(obj.date, obj.time, obj);
            const line = `bolus_units_delivered,source=${obj.bolus_source} value=${obj['bolus_volume_delivered_(u)']} ${timestamp}`;
            logger.trace(line);
            return line;
        }

        if ((json.type as Types) === 'MEAL') {
            const obj = json as Meal;

            if (obj.bwz_status === 'Delivered') {

                let targetString = '';
                const lowTarget = obj['bwz_target_low_bg_(mmol/l)'] as number;
                const highTarget = obj['bwz_target_high_bg_(mmol/l)'] as number;

                if (lowTarget && highTarget) {
                    const diff = highTarget - lowTarget;
                    const targetGlucose = lowTarget + (diff / 2);
                    targetString = `,target=${targetGlucose}`;
                }

                // assumed to always exist
                let carbs = '';
                if (obj['bwz_carb_input_(grams)'] !== undefined) {
                    carbs = `carbs=${obj['bwz_carb_input_(grams)']}`;
                } else {
                    throw new Error('Meal carbs not present');
                }

                let carbRatioString = '';
                if (obj['bwz_carb_ratio_(g/u)'] !== undefined) {
                    carbRatioString = `,carb_ratio=${obj['bwz_carb_ratio_(g/u)']}`;
                }
                let insulinSensititvity = '';
                if (obj['bwz_insulin_sensitivity_(mmol/l/u)'] !== undefined) {
                    insulinSensititvity = `,insulin_sensititvity=${obj['bwz_insulin_sensitivity_(mmol/l/u)']}`;
                }
                let glucoseReading = '';
                if (obj['bwz_bg/sg_input_(mmol/l)'] !== undefined) {
                    glucoseReading = `,glucose_reading=${obj['bwz_bg/sg_input_(mmol/l)']}`;
                }
                let correctionUnits = '';
                if (obj['bwz_correction_estimate_(u)'] !== undefined) {
                    correctionUnits = `,correction_units=${obj['bwz_correction_estimate_(u)']}`;
                }
                let mealBolus = '';
                if (obj['bwz_food_estimate_(u)'] !== undefined) {
                    mealBolus = `,meal_bolus=${obj['bwz_food_estimate_(u)']}`;
                }
                let activeInsulin = '';
                if (obj['bwz_active_insulin_(u)'] !== undefined) {
                    activeInsulin = `,active_insulin=${obj['bwz_active_insulin_(u)']}`;
                }

                const timestamp = formatTimestamp(obj.date, obj.time, obj);
                const line = `bolus_units_delivered ${carbs}${mealBolus}${correctionUnits}${glucoseReading}${insulinSensititvity}${carbRatioString}${targetString}${activeInsulin} ${timestamp}`;
                logger.trace(line);
                return line;
            }
        }

        if ((json.type as Types) === 'SENSOR_EXCEPTION') {
            const obj = json as SensorException;

            if ((obj.sensor_exception as SensorExceptionType) === 'SENSOR_END_OF_LIFE') {
                const timestamp = formatTimestamp(obj.date, obj.time, obj);
                const line = `sensor_expired value=1i ${timestamp}`;
                logger.trace(line);
                return line;
            }

            if (['SENSOR_CAL_ERROR', 'SENSOR_ERROR', 'SENSOR_CHANGE_SENSOR_ERROR'].includes(obj.sensor_exception)) {
                const timestamp = formatTimestamp(obj.date, obj.time, obj);
                const line = `sensor_error,error_type=${obj.sensor_exception} value=1i ${timestamp}`;
                logger.trace(line);
                return line;
            }
        }

        if ((json.type as Types) === 'SENSOR_READING') {
            const obj = json as SensorReading;
            const timestamp = formatTimestamp(obj.date, obj.time, obj);
            const line = `sensor_glucose_level value=${obj['sensor_glucose_(mmol/l)']} ${timestamp}`;
            logger.trace(line);
            return line;
        }

        if ((json.type as Types) === 'BASAL_TEMP_PERCENTAGE') {
            const obj = json as TempBasal;

            let durationString = '';
            if (obj['temp_basal_duration_(h:mm:ss)'] !== undefined) {
                durationString = `,duration="${obj['temp_basal_duration_(h:mm:ss)']}"`;
            }

            const timestamp = formatTimestamp(obj.date, obj.time, obj);
            const line = `temporary_basal_percentage value=${obj.temp_basal_amount}${durationString} ${timestamp}`;
            logger.trace(line);
            return line;
        }

    });
    return lines.filter(line => line) as string[];
}

new Promise(async (resolve, reject) => {
    const filename = '2023-12-21-original';
    let content = await loadFileContent(filename + '.csv');
    content = preProcess(content, 51);
    const { headers, lines } = split(content);
    const json: any[] = mapLinesToJsonArray(headers, lines);
    const parsed = json.map(obj => parse(obj));
    const outputLines = mapToOutputLines(parsed);
    const output = outputLines.join(os.EOL);
    await saveFileContent(filename + '.txt', output);
    console.log();
    console.log('DONE');
}).catch(error => console.error(error));
