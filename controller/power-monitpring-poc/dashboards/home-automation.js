(async function() {
   const loadData = async (aggregationPeriod, type, year, month, day) => {
        let url = `http://localhost:3000/data/${type}/${year}`;
        if (month) url += `?month=${month}`;
            if (day) url += `&day=${day}`;

       const response = await fetch(url);
       const data = await response.json();
       return data.results;
   };

    const lastDayOfMonth = moment(`2025-10`, 'YYYY-MM').endOf('month').format('DD');
    const daysInMonth = parseInt(lastDayOfMonth, 10);

    const promises = Array.from({ length: daysInMonth }).map((_, index) => {
        const day = `${index + 1}`.padStart(2, '0');
        return loadData('hourly', 'running_cost', '2025', '10', day);
    });
    const data = (await Promise.all(promises)).flat();
    // console.log('fetched', data);

    // const data = await loadData('hourly', 'running_cost', '2025', '10');
    const formatDataset = (hours, data, category) => {
        const filtered = data
            .filter(item => item.value != null)
            // .filter(item => !category || item.category === category)
            .filter(item => hours.includes(item.hour))
        console.log('filtered', filtered);

        const config = {
            // TODO
        };
        const dataset = filtered;

        return { config, dataset };
    };

    const hours = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];
    const { config, dataset } = formatDataset(hours, data);
    document.querySelector('bar-chart-2#day').setAttribute('config', JSON.stringify(config));
    document.querySelector('bar-chart-2#day').setAttribute('dataset', JSON.stringify(dataset));

    // document.querySelector('bar-chart-2#day'); //.setTotals(totals);
    // Object.values(descriptions).forEach(desc => {
    //     docy.querySelector('div#description').innerHTML += `<p>${descriptions}</p>`;
    // });
})();

