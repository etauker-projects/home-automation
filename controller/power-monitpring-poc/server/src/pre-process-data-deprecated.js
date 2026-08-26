import { readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import moment from 'moment/moment.js';

const inputFilepaths = [
  new URL('../data/inbox/home-assistant-2025-10-energy-usage.csv', import.meta.url),
  new URL('../data/inbox/home-assistant-2025-10-running-cost.csv', import.meta.url),
].forEach((inputFilepath) => {

  const csv = readFileSync(inputFilepath, 'utf-8');

  const config = {
    mappings: {
      // remove unnecessary fields
      metadata_id: 'null',
      start_utc: 'null',
      start_ts: 'null',
      created_ts: 'null',

      // numeric values
      value: 'number',

      // string values
      id: 'string',
      statistic_id: 'string',
      unit: 'string',
      created_utc: 'string',
      year: 'string',
      month: 'string',
      day: 'string',
      hour: 'string',
      minute: 'string',
      type: 'string',
      object: 'string',
      aggregation_period: 'string',
      category: 'string',
    },
    categories: {
      office_rack_home_automation_server_plug: 'technical',
      office_rack_switch_plug: 'technical',
      office_rack_ups_plug: 'technical',
      total_poe: 'technical',

      kitchen_kettle_plug: 'lifestyle',
      utility_room_microwave_plug: 'lifestyle',
      utility_room_washing_machine_plug: 'lifestyle',
      office_desk_plug: 'lifestyle',
      sitting_room_media_plug: 'lifestyle',
      sitting_room_ceiling_light: 'lifestyle',
    },
    metrics: [
      'running_cost',
      'energy_usage',
      'time_in_use',
    ],
  }

  const parsedValue = (key, value) => {
      const type = config.mappings[key];
      if (type === 'number') {
          return parseFloat(value, 10);
      } else if (type === 'null') {
          return null;
      }
      return value?.trim();
  };

  const rowsToProcess = undefined;
  const headers = csv.split('\n')[0].split(',').map((header) => header.trim());
  const values = csv
    .split('\n')
    .filter(line => line.trim().length > 0)
    .slice(1, rowsToProcess)
    .map((line) => {
      const cols = line.split(',');
      const entry = {};
      headers.forEach((header, index) => {
        const value = parsedValue(header, cols[index]);
        if (value !== null && value !== undefined) {
          entry[header] = value;
        }
      });

      const timestamp = moment(entry['created_utc']).startOf('minute').subtract(1, 'millisecond');

      if (!timestamp.isValid()) {
        console.warn('Invalid timestamp', entry);
        return;
      }

      entry['year'] = timestamp.format('YYYY');
      entry['month'] = timestamp.format('MM');
      entry['day'] = timestamp.format('DD');
      entry['hour'] = timestamp.format('HH');

      const entity_id = entry['statistic_id'] || '';
      entry['metric'] = config.metrics.map(metric => entity_id.includes(metric) ? metric : null).filter(Boolean)[0] || '';
      entry['object'] = entity_id.substring(entity_id.split('.')[0].length + 1, entity_id.indexOf(entry['metric']) - 1);
      entry['aggregation_period'] = entity_id.substring(entity_id.indexOf(entry['metric']) + entry['metric'].length + 1);
      entry['category'] = config.categories[entry['object']] ?? 'other';

      if (!entry['metric'] || !entry['object'] || !entry['aggregation_period']) {
        console.warn('Could not fully parse statistic_id', entry);
        return;
      }

      delete entry['statistic_id'];
      delete entry['created_utc'];
      // console.log('entry', entry);
      return entry;
  }).filter(Boolean);

  const files = values.reduce((map, entry) => {
    const outputFilename = `${entry.year}-${entry.month}-${entry.day}.${entry.metric}.${entry.aggregation_period}.json`;
    // const outputFilename = `${entry.year}-${entry.month}-${entry.day}.${entry.category}.${entry.metric}.json`;
    // console.log('outputFilename', outputFilename);

    if (!map[outputFilename]) {
      map[outputFilename] = [];
    }

    map[outputFilename].push(entry);
    return map;
  }, {});

  // console.log('files', files);

  Object.keys(files).forEach((outputFilename) => {
    console.log(outputFilename, files[outputFilename]?.length);
    const outputFilepath = new URL(`../data/processed/${outputFilename}`, import.meta.url);
    writeFile(outputFilepath, JSON.stringify(files[outputFilename]), 'utf-8');
  });
});
