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
    const result = service.split(inputObject) as { [key: string]: any };
    expect(Object.keys(result)).toEqual([
      '${ input.id }_energy_usage_hourly',
      '${ input.id }_energy_usage_daily',
      '${ input.id }_energy_usage_monthly',
    ]);

    expect(result['${ input.id }_energy_usage_hourly']).toEqual({
      name: '${ input.name } Energy Usage Hourly',
      source: 'sensor.${ input.id }_energy',
      cycle: 'hourly',
      unique_id: 'meter.${ input.id }_energy_usage_hourly',
      offset: 0,
      delta_values: false,
    });
    expect(result['${ input.id }_energy_usage_daily']).toEqual({
      name: '${ input.name } Energy Usage Daily',
      source: 'sensor.${ input.id }_energy',
      cycle: 'daily',
      unique_id: 'meter.${ input.id }_energy_usage_daily',
      offset: 0,
      delta_values: false,
    });
    expect(result['${ input.id }_energy_usage_monthly']).toEqual({
      name: '${ input.name } Energy Usage Monthly',
      source: 'sensor.${ input.id }_energy',
      cycle: 'monthly',
      unique_id: 'meter.${ input.id }_energy_usage_monthly',
      offset: 0,
      delta_values: false,
    });
  });

  it('should split array', () => {
    const result = service.split(inputArray) as object[];
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(4);
    expect(result[0]).toEqual({
      name: '${ input.name } Running Cost',
      unique_id: 'sensor.${ input.id }_running_cost',
      unit_of_measurement: 'cents',
      state_class: 'total_increasing',
      icon: 'mdi:currency-eur',
      state: `{% set consumption = float(states('sensor.\${ input.id }_energy'), 0.0) %} {% set price = float(states('input_number.electricity_rate'), 0.0) %} {{ (consumption * price * 100) | round(2, default=0) }}\n`,
    });
    expect(result[1]).toEqual({
      name: '${ input.name } Running Cost Hourly',
      unique_id: 'sensor.${ input.id }_running_cost_hourly',
      unit_of_measurement: 'cents',
      state_class: 'total_increasing',
      icon: 'mdi:currency-eur',
      state: `{% set consumption = float(states('sensor.\${ input.id }_energy_usage_hourly'), 0.0) %} {% set price = float(states('input_number.electricity_rate'), 0.0) %} {{ (consumption * price * 100) | round(2, default=0) }}\n`,
    });
    expect(result[2]).toEqual({
      name: '${ input.name } Running Cost Daily',
      unique_id: 'sensor.${ input.id }_running_cost_daily',
      unit_of_measurement: 'cents',
      state_class: 'total_increasing',
      icon: 'mdi:currency-eur',
      state: `{% set consumption = float(states('sensor.\${ input.id }_energy_usage_daily'), 0.0) %} {% set price = float(states('input_number.electricity_rate'), 0.0) %} {{ (consumption * price * 100) | round(2, default=0) }}\n`,
    });
    expect(result[3]).toEqual({
      name: '${ input.name } Running Cost Monthly',
      unique_id: 'sensor.${ input.id }_running_cost_monthly',
      unit_of_measurement: 'cents',
      state_class: 'total_increasing',
      icon: 'mdi:currency-eur',
      state: `{% set consumption = float(states('sensor.\${ input.id }_energy_usage_monthly'), 0.0) %} {% set price = float(states('input_number.electricity_rate'), 0.0) %} {{ (consumption * price * 100) | round(2, default=0) }}\n`,
    });
  });
});
