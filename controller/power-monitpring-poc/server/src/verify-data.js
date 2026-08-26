import { readFileSync } from 'fs';
import { resolve } from 'path';
import { readdir } from 'fs/promises';

const basepath = new URL('../data/processed', import.meta.url);
const files = await readdir(basepath);

files.forEach((inputFilepath) => {
  // console.log('inputFilepath', inputFilepath, basepath.pathname);
  const contents = readFileSync(resolve(basepath.pathname, inputFilepath), 'utf-8');
  const json = JSON.parse(contents);
  const distinctObjects = Array.from(new Set(json.map(item => item.object)));
  console.log(inputFilepath, json.length, distinctObjects.length);


  // // TODO finish verification
  // let expected = 0;
  // if (inputFilepath.includes('hourly')) {
  //   expected = 24 * distinctObjects.length;
  // } else if (inputFilepath.includes('daily')) {
  //   expected = 24 * distinctObjects.length;
  // } else if (inputFilepath.includes('monthly')) {
  //   expected = 24 * distinctObjects.length;
  // }

  const expectedCount = 24 * distinctObjects.length;
  if (json.length !== expectedCount) {
    console.warn(`- expected ${expectedCount} entries, found ${json.length}`);
  }

  // TODO: evaluate totals per obeject


  //     entry['year'] = timestamp.format('YYYY');
  //     entry['month'] = timestamp.format('MM');
  //     entry['day'] = timestamp.format('DD');
  //     entry['hour'] = timestamp.format('HH');

  //     const entity_id = entry['statistic_id'] || '';
  //     entry['metric'] = config.metrics.map(metric => entity_id.includes(metric) ? metric : null).filter(Boolean)[0] || '';
  //     entry['object'] = entity_id.substring(entity_id.split('.')[0].length + 1, entity_id.indexOf(entry['metric']) - 1);
  //     entry['aggregation_period'] = entity_id.substring(entity_id.indexOf(entry['metric']) + entry['metric'].length + 1);
  //     entry['category'] = config.categories[entry['object']] ?? 'other';

  //     if (!entry['metric'] || !entry['object'] || !entry['aggregation_period']) {
  //       console.warn('Could not fully parse statistic_id', entry);
  //       return;
  //     }

  //     delete entry['statistic_id'];
  //     delete entry['created_utc'];
  //     // console.log('entry', entry);
  //     return entry;
  // }).filter(Boolean);

  // console.log('files', files);
});
