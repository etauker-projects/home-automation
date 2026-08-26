import { readFileSync, writeFileSync } from 'node:fs';
import moment from 'moment/moment.js';

const groupBy = (array, key) => {
  return array.reduce((result, currentValue) => {
    if (!result[currentValue[key]]) {
      result[currentValue[key]] = [];
    }

    result[currentValue[key]].push(
      currentValue
    );
    return result;
  }, {});
};

const findLargestValueEntry = (entries, valueKey, tieBreakKey) => {
  return entries.reduce((maxEntry, currentEntry) => {
    if (currentEntry[valueKey] === maxEntry[valueKey]) {
      return currentEntry[tieBreakKey].localeCompare(maxEntry[tieBreakKey])
        ? maxEntry
        : currentEntry;
    }

    return currentEntry[valueKey] > maxEntry[valueKey]
      ? currentEntry
      : maxEntry;
  }, entries[0]);
}

const processMonthlyEntries = (year, month, entries) => {
  const filtered = entries
    .filter(entry => entry.aggregation_period === 'monthly')
    .filter(entry => entry.year === year)
    .filter(entry => entry.month === month)

  const stats = {
    descriptions: {
      general: {
        intialCount: 'Number of monthly entries for the given month (before processing)',
        finalCount: 'Number of monthly entries in output dataset',
        entityCount: 'Number of distinct objects in the output dataset',
      },
      objects: {
        inputCount: 'Number of monthly entries per object before processing',
        inputCoverage: 'Number of hourly entries per object in input dataset divided by expected maximum (24 hours x days in the month)',
        max: 'Max value per object for the month (highest recorded monthly value)',
        unit: 'Unit of measurement of the value',
      },
    },
    general: {
      type: 'monthly',
      year: year,
      month: month,
      intialCount: filtered.length,
      finalCount: 0,
      entityCount: 0,
      objects: {},
    },
  };

  const lastDayOfMonth = moment(`${year}-${month}`, 'YYYY-MM').endOf('month').format('DD');
  const daysInMonth = parseInt(lastDayOfMonth, 10);

  const grouped = groupBy(filtered, 'object');
  Object.keys(grouped).forEach(key => {
    const group = grouped[key];
    stats.general.objects[key] = {
      inputCount: group.length,
      inputCoverage: (group.length / 24 / daysInMonth),
      max: 0,
      unit: '?',
    }
  })

  const results  = Object.values(grouped).map(entries => findLargestValueEntry(entries, 'value', 'id'));
  results.forEach(entry => {
    stats.general.objects[entry.object].max = entry.value;
    stats.general.objects[entry.object].unit = entry.unit;;
  })

  stats.general.finalCount = results.length;
  stats.general.entityCount = Object.keys(grouped).length;

  const entry = results[0];
  const outputFilename = entry ? `${entry.year}.${entry.metric}.${entry.aggregation_period}` : '';
  return { filename: outputFilename, data: results, metadata: stats };
}

const processDailyEntries = (year, month, day, entries) => {
  const filtered = entries
    .filter(entry => entry.aggregation_period === 'daily')
    .filter(entry => entry.year === year)
    .filter(entry => entry.month === month)
    .filter(entry => entry.day === day)

  // console.log('processDailyEntries.filtered', filtered[0]);

  const stats = {
    descriptions: {
      general: {
        intialCount: 'Number of daily entries for the given day (before processing)',
        finalCount: 'Number of daily entries in output dataset',
        entityCount: 'Number of distinct objects in the output dataset',
      },
      objects: {
        inputCount: 'Number of daily entries per object before processing',
        inputCoverage: 'Number of hourly entries per object in input dataset divided by expected maximum (24 hours)',
        max: 'Max value per object for the day (highest recorded daily value)',
        unit: 'Unit of measurement of the value',
      },
    },
    general: {
      type: 'daily',
      year: year,
      month: month,
      day: day,
      intialCount: filtered.length,
      finalCount: 0,
      entityCount: 0,
      objects: {},
    },
  };

  const grouped = groupBy(filtered, 'object');
  Object.keys(grouped).forEach(key => {
    const group = grouped[key];
    stats.general.objects[key] = {
      inputCount: group.length,
      inputCoverage: (group.length / 24),
      max: 0,
      unit: '?',
    }
  })

  const results  = Object.values(grouped).map(entries => findLargestValueEntry(entries, 'value', 'id'));
  results.forEach(entry => {
    stats.general.objects[entry.object].max = entry.value;
    stats.general.objects[entry.object].unit = entry.unit;
  })

  stats.general.finalCount = results.length;
  stats.general.entityCount = Object.keys(grouped).length;

  const entry = results[0];
  const outputFilename = entry ? `${entry.year}-${entry.month}.${entry.metric}.${entry.aggregation_period}` : '';
  return { filename: outputFilename, data: results, metadata: stats };
}

const processHourlyEntries = (year, month, day, hour, entries) => {
  const filtered = entries
    .filter(entry => entry.aggregation_period === 'hourly')
    .filter(entry => entry.year === year)
    .filter(entry => entry.month === month)
    .filter(entry => entry.day === day)
    // .filter(entry => entry.hour === hour)

  const stats = {
    descriptions: {
      general: {
        intialCount: 'Number of hourly entries for the given hour (before processing)',
        finalCount: 'Number of hourly entries in output dataset',
        entityCount: 'Number of distinct objects in the output dataset',
      },
      objects: {
        inputCount: 'Number of hourly entries per object before processing',
        inputCoverage: 'Number of hourly entries per object in input dataset divided by expected maximum (1 hour)',
        max: 'Max value per object for the hour (highest recorded hourly value)',
        unit: 'Unit of measurement of the value',
      },
    },
    general: {
      type: 'hourly',
      year: year,
      month: month,
      day: day,
      hour: hour,
      intialCount: filtered.length,
      finalCount: 0,
      entityCount: 0,
      objects: {},
    },
  };

  const grouped = groupBy(filtered, 'object');
  Object.keys(grouped).forEach(key => {
    const group = grouped[key];
    stats.general.objects[key] = {
      inputCount: group.length,
      inputCoverage: group.length,
      max: 0,
      unit: '?',
    }
  })

  const results = Object.values(grouped).flat();
  results.forEach(entry => {
    stats.general.objects[entry.object].max += entry.value;
    stats.general.objects[entry.object].unit = entry.unit;
  })

  stats.general.finalCount = results.length;
  stats.general.entityCount = Object.keys(grouped).length;

  const entry = results[0];
  const outputFilename = entry ? `${entry.year}-${entry.month}-${entry.day}.${entry.metric}.${entry.aggregation_period}` : '';
  return { filename: outputFilename, data: results, metadata: stats };
}



[
  // TODO: iterate over all files in inbox
  new URL('../data/inbox/home-assistant-2025-10-energy-usage.csv', import.meta.url),
  new URL('../data/inbox/home-assistant-2025-10-running-cost.csv', import.meta.url),
].forEach(async (inputFilepath) => {
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
      // category: 'string',
    },
    // categories: {
    //   office_rack_home_automation_server_plug: 'technical',
    //   office_rack_switch_plug: 'technical',
    //   office_rack_ups_plug: 'technical',
    //   total_poe: 'technical',

    //   kitchen_kettle_plug: 'lifestyle',
    //   utility_room_microwave_plug: 'lifestyle',
    //   utility_room_washing_machine_plug: 'lifestyle',
    //   office_desk_plug: 'lifestyle',
    //   sitting_room_media_plug: 'lifestyle',
    //   sitting_room_ceiling_light: 'lifestyle',
    // },
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

      if (!entry['metric'] || !entry['object'] || !entry['aggregation_period']) {
        console.warn('Could not fully parse statistic_id', entry);
        return;
      }

      delete entry['statistic_id'];
      delete entry['created_utc'];
      return entry;
  }).filter(Boolean);

  const days = Array.from(new Set(values.map(entry => entry.day))).sort();
  const hours = Array.from(new Set(values.map(entry => entry.hour))).sort();


  const output = [
    processMonthlyEntries('2025', '10', values),
    ...days.flatMap(day => [
        processDailyEntries('2025', '10', day, values),
        ...hours.flatMap(hour => processHourlyEntries('2025', '10', day, hour, values)),
      ]
    ),
  ];


  const metadata = output.reduce((metas, file) => {
    metas.push({ filename: file.filename, metadata: file.metadata.general });

    if (file.data.length > 0) {
      const outputFilepath = new URL(`../data/processed/${file.filename}.json`, import.meta.url);
      writeFileSync(outputFilepath, JSON.stringify(file.data), { encoding: 'utf-8'});
    }

    return metas;
  }, []);

  const outputFilepath = new URL(`../data/metadata/${inputFilepath.pathname.split('/').pop().replace('.csv', '')}.json`, import.meta.url);
  writeFileSync(outputFilepath, JSON.stringify(metadata), { encoding: 'utf-8'});
});
