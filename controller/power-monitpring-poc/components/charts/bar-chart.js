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

const template = document.createElement('template');
template.innerHTML = `
    <div style="width: 100%;">
        <canvas></canvas>
        <div id="description"></div>
    </div>
`;

class BarChart extends HTMLElement {

    _labels = [];
    _datasets = [];

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        const container = template.content.cloneNode(true);
        this.shadowRoot.appendChild(container);
        // this.loadMockData().then(data => {
        //     // this.setAttribute('data', JSON.stringify(data));
        //     this._renderChart(data);
        // });
        console.log('hello world');
    }

    connectedCallback() {
        console.log('connected');
        // this.shadowRoot.querySelector('.wrapper').style.backgroundColor = this.getAttribute('background-colour') || 'burlywood';
    }

    attributeChangedCallback(name, oldValue, newValue) {
        console.log('attribute changed:', name, oldValue, newValue);
        if (name === 'datasets') {
            this._datasets = JSON.parse(newValue);
            if (this._labels.length > 0) {
                this._renderChart(this._labels, this._datasets);
            }
        } else if (name === 'labels') {
            this._labels = JSON.parse(newValue);
            if (this._datasets.length > 0) {
                this._renderChart(this._labels, this._datasets);
            }
        }
    }

    _renderChart(labels, datasets) {
        const chartData = {
            labels,
            datasets,
            // datasets: [{
            //     label: 'Dataset 1',
            //     data: chartValues,
            //     // backgroundColor: [
            //     //     'rgba(255, 99, 132, 0.2)',
            //     //     'rgba(255, 159, 64, 0.2)',
            //     //     'rgba(255, 205, 86, 0.2)',
            //     //     'rgba(75, 192, 192, 0.2)',
            //     //     'rgba(54, 162, 235, 0.2)',
            //     //     'rgba(153, 102, 255, 0.2)',
            //     //     'rgba(201, 203, 207, 0.2)'
            //     //     ],
            //     //     borderColor: [
            //     //     'rgb(255, 99, 132)',
            //     //     'rgb(255, 159, 64)',
            //     //     'rgb(255, 205, 86)',
            //     //     'rgb(75, 192, 192)',
            //     //     'rgb(54, 162, 235)',
            //     //     'rgb(153, 102, 255)',
            //     //     'rgb(201, 203, 207)'
            //     // ],
            // }]


            // labels.map(label => {
            //     const barData = filtered.filter(item => item.entity === label).map(item => item.state);
            //     console.log('label', label, barData);
            //     return {
            //         // label: label,
            //         data: barData,
            //         // borderColor: Utils.CHART_COLORS.red,
            //         // backgroundColor: Utils.transparentize(Utils.CHART_COLORS.red, 0.5),
            //         // backgroundColor: [
            //         // 'rgba(255, 99, 132, 0.2)',
            //         // 'rgba(255, 159, 64, 0.2)',
            //         // 'rgba(255, 205, 86, 0.2)',
            //         // 'rgba(75, 192, 192, 0.2)',
            //         // 'rgba(54, 162, 235, 0.2)',
            //         // 'rgba(153, 102, 255, 0.2)',
            //         // 'rgba(201, 203, 207, 0.2)'
            //         // ],
            //         // borderColor: [
            //         // 'rgb(255, 99, 132)',
            //         // 'rgb(255, 159, 64)',
            //         // 'rgb(255, 205, 86)',
            //         // 'rgb(75, 192, 192)',
            //         // 'rgb(54, 162, 235)',
            //         // 'rgb(153, 102, 255)',
            //         // 'rgb(201, 203, 207)'
            //         // ],
            //     }
            // })
        }

        const config = {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                scales: {
                    y: {
                       beginAtZero: true,
                       stacked: true,
                    },
                    x: {
                        stacked: true,
                    }
                },
                // plugins: {
                //     legend: {
                //         position: 'bottom',
                //     },
                //     title: {
                //         display: true,
                //         text: 'Chart.js Bar Chart'
                //     }
                // }
            },
        };


        const canvas = this.shadowRoot.querySelector('canvas');
        new Chart(canvas, config);

        // [
        //     {
        //         label: 'Dataset 1',
        //         data: Utils.numbers(NUMBER_CFG),
        //         borderColor: Utils.CHART_COLORS.red,
        //         backgroundColor: Utils.transparentize(Utils.CHART_COLORS.red, 0.5),
        //     },
        //     {
        //         label: 'Dataset 2',
        //         data: Utils.numbers(NUMBER_CFG),
        //         borderColor: Utils.CHART_COLORS.blue,
        //         backgroundColor: Utils.transparentize(Utils.CHART_COLORS.blue, 0.5),
        //     }
        // ]
        // };
    }

    setTotals(totals) {
        const descriptionDiv = this.shadowRoot.querySelector('div#description');
        descriptionDiv.innerHTML = 'Running cost per device:<br>';
        Object.keys(totals).forEach(obj => {
            descriptionDiv.innerHTML += `- ${obj}: ${totals[obj]}<br>`;
        });
    }

    // addRow(table, value) {
    //     const row = rowTemplate.content.cloneNode(true);
    //     row.querySelector('.time').textContent = this._formatTime(value.datetime);
    //     row.querySelector('.amount').textContent = this._formatAmount(value.amount, value.currency);
    //     row.querySelector('.description').textContent = this._formatDescription(value.description, value.references);
    //     table.querySelector('tbody').appendChild(row);
    //     console.log('table', table);
    // }

    static get observedAttributes() {
        return ['background-colour', 'labels', 'datasets', 'debug'];
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

}

window.customElements.define('bar-chart', BarChart);