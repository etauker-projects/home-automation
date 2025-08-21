import { TestBed } from '@angular/core/testing';

import { YamlService } from './yaml.service';

const inputObject = `
\${ input.id }_energy_usage_hourly:
    name: \${ input.name } Energy Usage Hourly
    source: sensor.\${ input.id }_energy
    cycle: hourly
    unique_id: meter.\${ input.id }_energy_usage_hourly
    offset: 0
    delta_values: false

\${ input.id }_energy_usage_daily:
    name: \${ input.name } Energy Usage Daily
    source: sensor.\${ input.id }_energy
    cycle: daily
    unique_id: meter.\${ input.id }_energy_usage_daily
    offset: 0
    delta_values: false

\${ input.id }_energy_usage_monthly:
    name: \${ input.name } Energy Usage Monthly
    source: sensor.\${ input.id }_energy
    cycle: monthly
    unique_id: meter.\${ input.id }_energy_usage_monthly
    offset: 0
    delta_values: false
`;

const inputArray = `
- name: \${ input.name } Running Cost
  unique_id: sensor.\${ input.id }_running_cost
  unit_of_measurement: "cents"
  state_class: total_increasing
  icon: mdi:currency-eur
  state: >
    {% set consumption = float(states('sensor.\${ input.id }_energy'), 0.0) %}
    {% set price = float(states('input_number.electricity_rate'), 0.0) %}
    {{ (consumption * price * 100) | round(2, default=0) }}

- name: \${ input.name } Running Cost Hourly
  unique_id: sensor.\${ input.id }_running_cost_hourly
  unit_of_measurement: "cents"
  state_class: total_increasing
  icon: mdi:currency-eur
  state: >
    {% set consumption = float(states('sensor.\${ input.id }_energy_usage_hourly'), 0.0) %}
    {% set price = float(states('input_number.electricity_rate'), 0.0) %}
    {{ (consumption * price * 100) | round(2, default=0) }}

- name: \${ input.name } Running Cost Daily
  unique_id: sensor.\${ input.id }_running_cost_daily
  unit_of_measurement: "cents"
  state_class: total_increasing
  icon: mdi:currency-eur
  state: >
    {% set consumption = float(states('sensor.\${ input.id }_energy_usage_daily'), 0.0) %}
    {% set price = float(states('input_number.electricity_rate'), 0.0) %}
    {{ (consumption * price * 100) | round(2, default=0) }}

- name: \${ input.name } Running Cost Monthly
  unique_id: sensor.\${ input.id }_running_cost_monthly
  unit_of_measurement: "cents"
  state_class: total_increasing
  icon: mdi:currency-eur
  state: >
    {% set consumption = float(states('sensor.\${ input.id }_energy_usage_monthly'), 0.0) %}
    {% set price = float(states('input_number.electricity_rate'), 0.0) %}
    {{ (consumption * price * 100) | round(2, default=0) }}
`;

fdescribe('YamlService', () => {
  let service: YamlService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(YamlService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should split object', () => {
    const result = service.split(inputObject);
    expect(result).toBeInstanceOf(Object);
    expect(result.length).toBe(3);

    const hourly = result[0];
    expect(hourly.type).toEqual('object');
    expect(hourly.key).toEqual('${ input.id }_energy_usage_hourly');
    expect(hourly.yaml).toEqual('${ input.id }_energy_usage_hourly:\n  name: ${ input.name } Energy Usage Hourly\n  source: sensor.${ input.id }_energy\n  cycle: hourly\n  unique_id: meter.${ input.id }_energy_usage_hourly\n  offset: 0\n  delta_values: false\n');
    expect(hourly.json).toEqual({
      '${ input.id }_energy_usage_hourly': {
        name: '${ input.name } Energy Usage Hourly',
        source: 'sensor.${ input.id }_energy',
        cycle: 'hourly',
        unique_id: 'meter.${ input.id }_energy_usage_hourly',
        offset: 0,
        delta_values: false,
      }
    });

    const daily = result[1];
    expect(daily.type).toEqual('object');
    expect(daily.key).toEqual('${ input.id }_energy_usage_daily');
    expect(daily.yaml).toEqual('${ input.id }_energy_usage_daily:\n  name: ${ input.name } Energy Usage Daily\n  source: sensor.${ input.id }_energy\n  cycle: daily\n  unique_id: meter.${ input.id }_energy_usage_daily\n  offset: 0\n  delta_values: false\n');
    expect(daily.json).toEqual({
      '${ input.id }_energy_usage_daily': {
        name: '${ input.name } Energy Usage Daily',
        source: 'sensor.${ input.id }_energy',
        cycle: 'daily',
        unique_id: 'meter.${ input.id }_energy_usage_daily',
        offset: 0,
        delta_values: false,
      }
    });

    const monthly = result[2];
    expect(monthly.type).toEqual('object');
    expect(monthly.key).toEqual('${ input.id }_energy_usage_monthly');
    expect(monthly.yaml).toEqual('${ input.id }_energy_usage_monthly:\n  name: ${ input.name } Energy Usage Monthly\n  source: sensor.${ input.id }_energy\n  cycle: monthly\n  unique_id: meter.${ input.id }_energy_usage_monthly\n  offset: 0\n  delta_values: false\n');
    expect(monthly.json).toEqual({
      '${ input.id }_energy_usage_monthly': {
        name: '${ input.name } Energy Usage Monthly',
        source: 'sensor.${ input.id }_energy',
        cycle: 'monthly',
        unique_id: 'meter.${ input.id }_energy_usage_monthly',
        offset: 0,
        delta_values: false,
      }
    });
  });

  it('should split array', () => {
    const result = service.split(inputArray);
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(4);

    const cost = result[0];
    expect(cost.type).toEqual('array');
    expect(cost.key).toEqual('${ input.name } Running Cost');
    expect(cost.yaml).toEqual('name: ${ input.name } Running Cost\nunique_id: sensor.${ input.id }_running_cost\nunit_of_measurement: cents\nstate_class: total_increasing\nicon: mdi:currency-eur\nstate: >\n  {% set consumption = float(states(\'sensor.${ input.id }_energy\'), 0.0) %} {%\n  set price = float(states(\'input_number.electricity_rate\'), 0.0) %} {{\n  (consumption * price * 100) | round(2, default=0) }}\n');
    expect(cost.json).toEqual({
      name: '${ input.name } Running Cost',
      unique_id: 'sensor.${ input.id }_running_cost',
      unit_of_measurement: 'cents',
      state_class: 'total_increasing',
      icon: 'mdi:currency-eur',
      state: '{% set consumption = float(states(\'sensor.${ input.id }_energy\'), 0.0) %} {% set price = float(states(\'input_number.electricity_rate\'), 0.0) %} {{ (consumption * price * 100) | round(2, default=0) }}\n',
    });

    const hourly = result[1];
    expect(hourly.type).toEqual('array');
    expect(hourly.key).toEqual('${ input.name } Running Cost Hourly');
    expect(hourly.yaml).toEqual('name: ${ input.name } Running Cost Hourly\nunique_id: sensor.${ input.id }_running_cost_hourly\nunit_of_measurement: cents\nstate_class: total_increasing\nicon: mdi:currency-eur\nstate: >\n  {% set consumption = float(states(\'sensor.${ input.id }_energy_usage_hourly\'),\n  0.0) %} {% set price = float(states(\'input_number.electricity_rate\'), 0.0) %}\n  {{ (consumption * price * 100) | round(2, default=0) }}\n');
    expect(hourly.json).toEqual({
      name: '${ input.name } Running Cost Hourly',
      unique_id: 'sensor.${ input.id }_running_cost_hourly',
      unit_of_measurement: 'cents',
      state_class: 'total_increasing',
      icon: 'mdi:currency-eur',
      state: '{% set consumption = float(states(\'sensor.${ input.id }_energy_usage_hourly\'), 0.0) %} {% set price = float(states(\'input_number.electricity_rate\'), 0.0) %} {{ (consumption * price * 100) | round(2, default=0) }}\n',
    });

    const daily = result[2];
    expect(daily.type).toEqual('array');
    expect(daily.key).toEqual('${ input.name } Running Cost Daily');
    expect(daily.yaml).toEqual('name: ${ input.name } Running Cost Daily\nunique_id: sensor.${ input.id }_running_cost_daily\nunit_of_measurement: cents\nstate_class: total_increasing\nicon: mdi:currency-eur\nstate: >\n  {% set consumption = float(states(\'sensor.${ input.id }_energy_usage_daily\'),\n  0.0) %} {% set price = float(states(\'input_number.electricity_rate\'), 0.0) %}\n  {{ (consumption * price * 100) | round(2, default=0) }}\n');
    expect(daily.json).toEqual({
      name: '${ input.name } Running Cost Daily',
      unique_id: 'sensor.${ input.id }_running_cost_daily',
      unit_of_measurement: 'cents',
      state_class: 'total_increasing',
      icon: 'mdi:currency-eur',
      state: '{% set consumption = float(states(\'sensor.${ input.id }_energy_usage_daily\'), 0.0) %} {% set price = float(states(\'input_number.electricity_rate\'), 0.0) %} {{ (consumption * price * 100) | round(2, default=0) }}\n',
    });

    const monthly = result[3];
    expect(monthly.type).toEqual('array');
    expect(monthly.key).toEqual('${ input.name } Running Cost Monthly');
    expect(monthly.yaml).toEqual('name: ${ input.name } Running Cost Monthly\nunique_id: sensor.${ input.id }_running_cost_monthly\nunit_of_measurement: cents\nstate_class: total_increasing\nicon: mdi:currency-eur\nstate: >\n  {% set consumption = float(states(\'sensor.${ input.id\n  }_energy_usage_monthly\'), 0.0) %} {% set price =\n  float(states(\'input_number.electricity_rate\'), 0.0) %} {{ (consumption * price\n  * 100) | round(2, default=0) }}\n');
    expect(monthly.json).toEqual({
      name: '${ input.name } Running Cost Monthly',
      unique_id: 'sensor.${ input.id }_running_cost_monthly',
      unit_of_measurement: 'cents',
      state_class: 'total_increasing',
      icon: 'mdi:currency-eur',
      state: '{% set consumption = float(states(\'sensor.${ input.id }_energy_usage_monthly\'), 0.0) %} {% set price = float(states(\'input_number.electricity_rate\'), 0.0) %} {{ (consumption * price * 100) | round(2, default=0) }}\n',
    });

  });
});
