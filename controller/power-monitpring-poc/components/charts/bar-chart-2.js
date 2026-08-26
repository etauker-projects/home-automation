// const gridTemplate = document.createElement('template');
// gridTemplate.innerHTML = `
//     <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 2fr)); gap: 1%;">
//     </div>
// `;

// const tableTemplate = document.createElement('template');
// tableTemplate.innerHTML = `
//     <div class="wrapper" style="min-width: fit-content; max-height: 300px; margin: 0; font-family: 'Gill Sans', sans-serif; border-radius: 0 3em 0 3em; padding: 2% 3% 3% 3%; border: 2px solid black; background-color: burlywood;">
//         <p style="margin: 0;padding-bottom: 4%;"><strong>13/01/2025</strong></p>
//         <table width="100%;">
//             <tbody style="width: 100%;"></tbody>
//         </table>
//     </div>
// `;

const template2 = document.createElement('template');
// TODO: calculate width and height dynamically based basen on the data if possible
template2.innerHTML = `
    <div>
        <canvas width="1000" height="500"></canvas>
    </div>
`;

class BarChart2 extends HTMLElement {

    _config = [];
    _dataset = [];

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        const container = template2.content.cloneNode(true);
        this.shadowRoot.appendChild(container);
        console.log('hello world');
    }

    connectedCallback() {
        console.log('connected');
        // this.shadowRoot.querySelector('.wrapper').style.backgroundColor = this.getAttribute('background-colour') || 'burlywood';
    }

    attributeChangedCallback(name, oldValue, newValue) {
        console.log('attribute changed:', name, oldValue, newValue);
        if (name === 'config') {
            this._config = JSON.parse(newValue);
            if (this._dataset.length > 0) {
                this._renderChart(this._config, this._dataset);
            }
        } else if (name === 'dataset') {
            this._dataset = JSON.parse(newValue);
            if (this._config) {
                this._renderChart(this._config, this._dataset);
            }
        }
    }

    _renderChart(config, dataset) {
        const distinct = (dataset, property) => {
            const all = dataset.map(item => item[property]);
            return Array.from(new Set(all));
        }

        // TODO: get from here
        config = {
            yProperty: 'value',
            xPropery: 'hour',
            // xValues: ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
            seriesProperty: 'object',
            seriesSort: 'total', // 'alphabetic' | 'total'
            // seriesValues: ['kitchen_kettle_plug', 'utility_room_microwave_plug', 'office_desk_plug', 'sitting_room_media_plug'],
        }

        config = {
            ...config,
            xValues: config.xValues ?? distinct(dataset, config.xPropery).sort(),
            seriesValues: config.seriesValues ?? distinct(dataset, config.seriesProperty).sort(),
        }

        console.log('config for chart', config);

        var canvas = this.shadowRoot.querySelector('canvas');
        var chart = echarts.init(canvas);

        const totals = {};
        const data = config.xValues.map(x => {
            const row = { };
            row[config.xPropery] = x;
            config.seriesValues.forEach(series => {

                const centValue = dataset
                    .filter(item => item[config.xPropery] === x && item[config.seriesProperty] === series)
                    .reduce((total, entry) => {
                        if (!entry?.[config.yProperty]) {
                            console.log(`No data for hour ${x} / ${series}`);
                            return total + 0;
                        } else if (entry.unit === 'cents') {
                            console.log(`Unit is cents for hour ${x} / ${series}, value = ${entry[config.yProperty]}`);
                            return total + entry[config.yProperty];
                        } else if (entry.unit === '€' || entry.unit?.toLocaleUpperCase() === 'EUR') {
                            console.log(`Unit is euros for hour ${x} / ${series}, converting to cents`);
                            return total + entry[config.yProperty] * 100;
                        } else {
                            console.log(`Unknown unit ${entry.unit} for value ${entry[config.yProperty]}, assuming cent`);
                            return total + entry[config.yProperty];
                        }
                    }, 0);


                // row[series] = value;
                row[series] = centValue / 100;
                // console.log('series', series, value);

                // TODO: extract to separate function?
                if (!totals[series]) {
                    totals[series] = 0;
                }

                totals[series] += centValue;

                if (series === 'office_desk_plug') {
                    console.log(`Adding ${centValue} to total for ${series}, now ${totals[series]}`);
                    console.log(`Series ${series} has row value ${row[series]} for hour ${x}`);
                }
            });

            return row;
        });

        console.log('data', data);

        // convert totals to euros
        Object.keys(totals).forEach(key => {
            totals[key] = Math.round(totals[key]) / 100;
        });

        const option = {
            legend: {}, // TODO: configure
            tooltip: {}, // TODO: configure to show cost total and breakdown by series
            // dataset: {
            //     // dimentions: [config.xPropery, ...config.seriesValues],
            //     // source: data,
            // },
            xAxis: {
                data: config.xValues,
            },
            yAxis: {

            },
            series: config.seriesValues
                .filter(object => totals[object] > 0)
                .toSorted((a, b) => {
                    if (config.seriesSort === 'alphabetic') {
                        return a.localeCompare(b);
                    } else if (config.seriesSort === 'total') {
                        return totals[b] - totals[a];
                    } else {
                        return 0;
                    }
                })
                .map(object => ({
                    name: this._humanizeSeriesName(object) + ` (€${totals[object]})`,
                    data: data
                    // .sort((rowA, rowB) => {
                    //     if (config.seriesSort === 'alphabetic') {
                    //         return rowA[config.seriesProperty].localeCompare(rowB[config.seriesProperty]);
                    //     } else if (config.seriesSort === 'total') {
                    //         return totals[rowA.object] - totals[rowB.object];
                    //     } else {
                    //         return 0;
                    //     }
                    // })
                    .map(row => row[object]),
                    type: 'bar',
                    stack: 'x',
                    emphasis: {
                        focus: 'series'
                    }
                }))
        };

        chart.setOption(option);
    }

    // setTotals(totals) {
    //     const descriptionDiv = this.shadowRoot.querySelector('div#description');
    //     descriptionDiv.innerHTML = 'Running cost per device:<br>';
    //     Object.keys(totals).forEach(obj => {
    //         descriptionDiv.innerHTML += `- ${obj}: ${totals[obj]}<br>`;
    //     });
    // }

    static get observedAttributes() {
        return ['background-colour', 'config', 'dataset', 'debug'];
    }

    // _formatTime(datetime) {
    //     return moment.utc(datetime).format('HH:mm');
    // }

    // _formatAmount(amount, currency) {
    //     const cents = Math.round((amount % 1) * 100);
    //     const centsStr = `${cents}`.padStart(2, '0');
    //     const whole = Math.floor(amount);
    //     const wholeStr = this._separateThousands(whole);
    //     return `${currency}${wholeStr}.${centsStr}`;
    // }

    // _formatDescription(description, references = []) {
    //     const desc = description;
    //     const refs = references?.length > 0 ? ` (${references.join(', ')})` : '';
    //     return `${desc}${refs}`;
    // }

    // _separateThousands(value) {
    //     let valueStr = `${value}`;
    //     let pieces = [];
    //     let interval = 3;

    //     const modulus = valueStr.length % interval;

    //     if (modulus > 0) {
    //         pieces.push(valueStr.substring(0, modulus));
    //         valueStr = valueStr.substring(modulus)
    //     }

    //     while (valueStr.length > 0) {
    //         pieces.push(valueStr.substring(0, interval));
    //         valueStr = valueStr.substring(interval)
    //     }

    //     return pieces.join(',');
    // }

    _humanizeSeriesName(seriesName) {
        return seriesName.replaceAll('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

}

window.customElements.define('bar-chart-2', BarChart2);