export class PowerMonitoringPage {

    /**
     * Renders the main Power Monitoring page with ECharts visualization.
     * @returns HTML string for the power monitoring page
     */
    public static render(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Power Monitoring</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                
                <!-- External Dependencies -->
                <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
                
                <style>
                    * {
                        box-sizing: border-box;
                    }
                    body {
                        background-color: #121212;
                        color: #e0e0e0;
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        margin: 0;
                    }
                    h1 {
                        color: #64b5f6;
                        margin-bottom: 10px;
                    }
                    nav {
                        margin: 20px 0;
                        padding-bottom: 20px;
                        border-bottom: 1px solid #333;
                        display: flex;
                        gap: 20px;
                    }
                    a {
                        color: #64b5f6;
                        text-decoration: none;
                    }
                    a:hover {
                        text-decoration: underline;
                    }
                    
                    /* Controls Section */
                    .controls {
                        background-color: #1e1e1e;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 8px;
                        display: flex;
                        flex-wrap: wrap;
                        gap: 20px;
                        align-items: flex-end;
                    }
                    .control-group {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .control-group label {
                        font-size: 12px;
                        color: #999;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    select {
                        background-color: #2a2a2a;
                        color: #e0e0e0;
                        border: 1px solid #444;
                        padding: 10px 15px;
                        border-radius: 4px;
                        font-size: 14px;
                        min-width: 150px;
                        cursor: pointer;
                    }
                    select:hover {
                        border-color: #64b5f6;
                    }
                    select:focus {
                        outline: none;
                        border-color: #64b5f6;
                        box-shadow: 0 0 0 2px rgba(100, 181, 246, 0.2);
                    }
                    
                    /* Aggregation Toggle */
                    .aggregation-toggle {
                        display: flex;
                        background-color: #2a2a2a;
                        border-radius: 4px;
                        overflow: hidden;
                    }
                    .aggregation-toggle button {
                        background-color: transparent;
                        color: #e0e0e0;
                        border: none;
                        padding: 10px 20px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s;
                    }
                    .aggregation-toggle button:not(:disabled):hover {
                        background-color: #333;
                    }
                    .aggregation-toggle button.active {
                        background-color: #64b5f6;
                        color: #121212;
                    }
                    .aggregation-toggle button:disabled {
                        cursor: default;
                    }
                    
                    /* Load Button */
                    .btn {
                        padding: 10px 25px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: bold;
                        transition: all 0.2s;
                    }
                    .btn-primary {
                        background-color: #64b5f6;
                        color: #121212;
                    }
                    .btn-primary:hover {
                        background-color: #42a5f5;
                    }
                    .btn-primary:disabled {
                        background-color: #424242;
                        color: #666;
                        cursor: not-allowed;
                    }
                    
                    /* Chart Container */
                    .chart-container {
                        background-color: #1e1e1e;
                        border-radius: 8px;
                        padding: 20px;
                        margin: 20px 0;
                        min-height: 500px;
                    }
                    #chart {
                        width: 100%;
                        height: 500px;
                    }
                    
                    /* Status Messages */
                    .status-message {
                        padding: 15px 20px;
                        border-radius: 4px;
                        margin: 20px 0;
                        display: none;
                    }
                    .status-message.success {
                        background-color: #1e1e1e;
                        border-left: 4px solid #4caf50;
                        color: #4caf50;
                    }
                    .status-message.error {
                        background-color: #1e1e1e;
                        border-left: 4px solid #f44336;
                        color: #f44336;
                    }
                    .status-message.loading {
                        background-color: #1e1e1e;
                        border-left: 4px solid #64b5f6;
                        color: #64b5f6;
                    }
                    .status-message.info {
                        background-color: #1e1e1e;
                        border-left: 4px solid #ff9800;
                        color: #ff9800;
                    }
                    
                    /* Summary Stats */
                    .summary-stats {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 15px;
                        margin: 20px 0;
                    }
                    .stat-card {
                        background-color: #1e1e1e;
                        padding: 15px 25px;
                        border-radius: 8px;
                        min-width: 150px;
                    }
                    .stat-value {
                        font-size: 24px;
                        font-weight: bold;
                        color: #64b5f6;
                    }
                    .stat-label {
                        font-size: 12px;
                        color: #999;
                        text-transform: uppercase;
                        margin-top: 5px;
                    }
                    
                    /* No Data State */
                    .no-data {
                        text-align: center;
                        padding: 60px 20px;
                        color: #666;
                    }
                    .no-data-icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                    }
                </style>
            </head>
            <body>
                <nav>
                    <a href="/ui/home">← Back to Home</a>
                    <a href="/ui/power-monitoring/ingestion">📥 Data Ingestion</a>
                </nav>
                
                <h1>Power Monitoring</h1>
                
                <!-- Controls -->
                <div class="controls">
                    <div class="control-group">
                        <label>Metric</label>
                        <select id="metricSelect">
                            <option value="running_cost">Running Cost (€)</option>
                            <option value="energy_usage">Energy Usage (kWh)</option>
                            <option value="time_in_use">Time in Use</option>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label>Year</label>
                        <select id="yearSelect">
                            <option value="">Loading…</option>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label>Month</label>
                        <select id="monthSelect">
                            <option value="">All Months</option>
                            <option value="01">January</option>
                            <option value="02">February</option>
                            <option value="03">March</option>
                            <option value="04">April</option>
                            <option value="05">May</option>
                            <option value="06">June</option>
                            <option value="07">July</option>
                            <option value="08">August</option>
                            <option value="09">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label>Day</label>
                        <select id="daySelect" disabled>
                            <option value="">All Days</option>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label>View</label>
                        <div class="aggregation-toggle">
                            <button data-period="monthly" class="active" disabled>Monthly</button>
                            <button data-period="daily" disabled>Daily</button>
                            <button data-period="hourly" disabled>Hourly</button>
                        </div>
                    </div>
                    
                    <button id="loadBtn" class="btn btn-primary">Load Data</button>
                </div>
                
                <div id="statusMessage" class="status-message"></div>
                
                <!-- Summary Stats -->
                <div id="summaryStats" class="summary-stats" style="display: none;">
                    <div class="stat-card">
                        <div class="stat-value" id="totalValue">€0.00</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="deviceCount">0</div>
                        <div class="stat-label">Devices</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="dataPoints">0</div>
                        <div class="stat-label">Data Points</div>
                    </div>
                </div>
                
                <!-- Chart -->
                <div class="chart-container">
                    <div id="chart"></div>
                    <div id="noData" class="no-data" style="display: none;">
                        <div class="no-data-icon">📊</div>
                        <p>No data available for the selected period.</p>
                        <p>Try selecting a different date range or uploading CSV data.</p>
                    </div>
                </div>

                <script>
                    // State
                    let chart = null;
                    let currentPeriod = 'monthly';
                    let currentData = [];
                    
                    // DOM Elements
                    const metricSelect = document.getElementById('metricSelect');
                    const yearSelect = document.getElementById('yearSelect');
                    const monthSelect = document.getElementById('monthSelect');
                    const daySelect = document.getElementById('daySelect');
                    const loadBtn = document.getElementById('loadBtn');
                    const statusMessage = document.getElementById('statusMessage');
                    const summaryStats = document.getElementById('summaryStats');
                    const noDataDiv = document.getElementById('noData');
                    const chartDiv = document.getElementById('chart');
                    const periodButtons = document.querySelectorAll('.aggregation-toggle button');
                    
                    // Initialize chart
                    function initChart() {
                        chart = echarts.init(chartDiv);
                        window.addEventListener('resize', () => chart.resize());
                    }
                    
                    // Show status message
                    function showMessage(message, type) {
                        statusMessage.textContent = message;
                        statusMessage.className = 'status-message ' + type;
                        statusMessage.style.display = 'block';
                        
                        if (type !== 'loading') {
                            setTimeout(() => {
                                statusMessage.style.display = 'none';
                            }, 5000);
                        }
                    }
                    
                    // Derive the aggregation period from the current month/day selection
                    // and update the toggle indicator + enable/disable day select accordingly.
                    function updateControlState() {
                        const month = monthSelect.value;
                        const day   = daySelect.value;

                        if (!month) {
                            currentPeriod = 'monthly';
                            daySelect.disabled = true;
                            daySelect.value = '';
                        } else if (!day) {
                            currentPeriod = 'daily';
                            daySelect.disabled = false;
                        } else {
                            currentPeriod = 'hourly';
                            daySelect.disabled = false;
                        }

                        // Reflect the derived period on the read-only toggle indicator
                        periodButtons.forEach(btn => {
                            btn.classList.toggle('active', btn.dataset.period === currentPeriod);
                        });
                    }
                    
                    // Month change - populate days and re-derive period
                    monthSelect.addEventListener('change', async () => {
                        const year  = yearSelect.value;
                        const month = monthSelect.value;

                        // Reset day whenever month changes
                        daySelect.innerHTML = '<option value="">All Days</option>';
                        daySelect.value = '';

                        if (month) {
                            try {
                                const response = await fetch(\`/ui/power-monitoring/days/\${year}/\${month}\`);
                                const data = await response.json();
                                data.days.forEach(day => {
                                    const option = document.createElement('option');
                                    option.value = day;
                                    option.textContent = parseInt(day, 10);
                                    daySelect.appendChild(option);
                                });
                            } catch (error) {
                                console.error('Error loading days:', error);
                            }
                        }

                        updateControlState();
                    });

                    // Day change - re-derive period
                    daySelect.addEventListener('change', () => {
                        updateControlState();
                    });
                    
                    // Load data
                    loadBtn.addEventListener('click', loadData);
                    
                    async function loadData() {
                        const metric = metricSelect.value;
                        const year = yearSelect.value;
                        const month = monthSelect.value;
                        const day = daySelect.value;
                        
                        loadBtn.disabled = true;
                        showMessage('Loading data...', 'loading');
                        
                        try {
                            let url = \`/ui/power-monitoring/data/\${metric}/\${year}\`;
                            const params = new URLSearchParams();
                            
                            if (currentPeriod === 'daily' && month) {
                                params.append('month', month);
                            } else if (currentPeriod === 'hourly' && month) {
                                params.append('month', month);
                                if (day) {
                                    params.append('day', day);
                                }
                            }
                            
                            if (params.toString()) {
                                url += '?' + params.toString();
                            }
                            
                            const response = await fetch(url);
                            const data = await response.json();
                            
                            if (response.ok && data.results) {
                                currentData = data.results;
                                console.log('Loaded data:', currentData);
                                
                                if (currentData.length === 0) {
                                    showNoData();
                                    showMessage('No data found for the selected period.', 'info');
                                } else {
                                    hideNoData();
                                    renderChart(currentData, metric, currentPeriod);
                                    updateSummary(currentData, metric);
                                    showMessage(\`Loaded \${currentData.length} data points\`, 'success');
                                }
                            } else {
                                showNoData();
                                showMessage('Error loading data: ' + (data.error || 'Unknown error'), 'error');
                            }
                        } catch (error) {
                            showNoData();
                            showMessage('Error loading data: ' + error.message, 'error');
                        } finally {
                            loadBtn.disabled = false;
                        }
                    }
                    
                    function showNoData() {
                        noDataDiv.style.display = 'block';
                        chartDiv.style.display = 'none';
                        summaryStats.style.display = 'none';
                    }
                    
                    function hideNoData() {
                        noDataDiv.style.display = 'none';
                        chartDiv.style.display = 'block';
                        summaryStats.style.display = 'flex';
                    }
                    
                    // Render ECharts stacked bar chart
                    function renderChart(data, metric, period) {
                        // Get unique x-axis values based on period
                        let xProperty;
                        if (period === 'hourly') {
                            xProperty = 'hour';
                        } else if (period === 'daily') {
                            xProperty = 'day';
                        } else {
                            xProperty = 'month';
                        }
                        
                        const xValues = [...new Set(data.map(d => d[xProperty]))].sort();
                        const devices = [...new Set(data.map(d => d.object))];
                        
                        // Calculate totals per device
                        const totals = {};
                        devices.forEach(device => {
                            totals[device] = data
                                .filter(d => d.object === device)
                                .reduce((sum, d) => {
                                    // Normalize to consistent unit
                                    let value = d.value || 0;
                                    if (d.unit === '€' || d.unit?.toUpperCase() === 'EUR') {
                                        value = value * 100; // Convert to cents
                                    }
                                    return sum + value;
                                }, 0);
                        });
                        
                        // Sort devices by total (highest first)
                        const sortedDevices = devices
                            .filter(d => totals[d] > 0)
                            .sort((a, b) => totals[b] - totals[a]);
                        
                        // Build series data
                        const series = sortedDevices.map(device => {
                            const deviceData = xValues.map(x => {
                                const entries = data.filter(d => d[xProperty] === x && d.object === device);
                                const sum = entries.reduce((total, d) => {
                                    let value = d.value || 0;
                                    if (d.unit === 'cents') {
                                        value = value / 100;
                                    }
                                    return total + value;
                                }, 0);
                                return sum;
                            });
                            
                            const displayTotal = (totals[device] / 100).toFixed(2);
                            const unit = metric === 'running_cost' ? '€' : (metric === 'energy_usage' ? 'kWh' : 'hrs');
                            
                            return {
                                name: humanizeName(device) + \` (\${unit}\${displayTotal})\`,
                                type: 'bar',
                                stack: 'total',
                                emphasis: { focus: 'series' },
                                data: deviceData
                            };
                        });
                        
                        // Format x-axis labels
                        const xLabels = xValues.map(x => {
                            if (period === 'hourly') {
                                return x + ':00';
                            } else if (period === 'daily') {
                                return 'Day ' + parseInt(x, 10);
                            } else {
                                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                return months[parseInt(x, 10) - 1] || x;
                            }
                        });
                        
                        const option = {
                            backgroundColor: '#1e1e1e',
                            tooltip: {
                                trigger: 'axis',
                                axisPointer: { type: 'shadow' },
                                backgroundColor: '#2a2a2a',
                                borderColor: '#444',
                                textStyle: { color: '#e0e0e0' }
                            },
                            legend: {
                                type: 'scroll',
                                orient: 'horizontal',
                                bottom: 0,
                                textStyle: { color: '#e0e0e0' },
                                pageTextStyle: { color: '#e0e0e0' },
                                pageIconColor: '#64b5f6',
                                pageIconInactiveColor: '#666'
                            },
                            grid: {
                                left: '3%',
                                right: '4%',
                                bottom: '15%',
                                top: '10%',
                                containLabel: true
                            },
                            xAxis: {
                                type: 'category',
                                data: xLabels,
                                axisLine: { lineStyle: { color: '#444' } },
                                axisLabel: { color: '#999' }
                            },
                            yAxis: {
                                type: 'value',
                                axisLine: { lineStyle: { color: '#444' } },
                                axisLabel: { color: '#999' },
                                splitLine: { lineStyle: { color: '#333' } }
                            },
                            series: series
                        };
                        
                        chart.setOption(option, true);
                    }
                    
                    // Humanize device name
                    function humanizeName(name) {
                        return name
                            .replace(/_/g, ' ')
                            .split(' ')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');
                    }
                    
                    // Update summary stats
                    function updateSummary(data, metric) {
                        const devices = [...new Set(data.map(d => d.object))];
                        
                        // Calculate total
                        let total = data.reduce((sum, d) => {
                            let value = d.value || 0;
                            if (d.unit === '€' || d.unit?.toUpperCase() === 'EUR') {
                                value = value * 100;
                            }
                            return sum + value;
                        }, 0);
                        
                        // Format total based on metric
                        let totalDisplay;
                        if (metric === 'running_cost') {
                            totalDisplay = '€' + (total / 100).toFixed(2);
                        } else if (metric === 'energy_usage') {
                            totalDisplay = (total / 100).toFixed(2) + ' kWh';
                        } else {
                            totalDisplay = (total / 100).toFixed(2) + ' hrs';
                        }
                        
                        document.getElementById('totalValue').textContent = totalDisplay;
                        document.getElementById('deviceCount').textContent = devices.length;
                        document.getElementById('dataPoints').textContent = data.length;
                    }
                    
                    // Populate year dropdown from API
                    async function loadYears() {
                        try {
                            const response = await fetch('/ui/power-monitoring/years');
                            const data = await response.json();
                            const years = data.years || [];

                            yearSelect.innerHTML = '';
                            if (years.length === 0) {
                                const opt = document.createElement('option');
                                opt.value = '';
                                opt.textContent = 'No data';
                                yearSelect.appendChild(opt);
                            } else {
                                years.forEach(year => {
                                    const opt = document.createElement('option');
                                    opt.value = year;
                                    opt.textContent = year;
                                    yearSelect.appendChild(opt);
                                });
                                // Default to the most recent year
                                yearSelect.value = years[years.length - 1];
                            }
                        } catch (error) {
                            console.error('Error loading years:', error);
                            yearSelect.innerHTML = '<option value="">Error</option>';
                        }
                    }

                    // Initialize
                    initChart();
                    updateControlState();
                    loadYears();
                    
                    // Auto-load on page load (optional)
                    // loadData();
                </script>
            </body>
            </html>
        `;
    }

    /**
     * Renders an error page for the Power Monitoring page.
     * @param error - The error that occurred
     * @returns HTML string for the error page
     */
    public static renderError(error: Error | string): string {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error</title>
                <style>
                    body {
                        background-color: #121212;
                        color: #e0e0e0;
                        font-family: Arial, sans-serif;
                        padding: 20px;
                    }
                    .error {
                        color: #f44336;
                        background-color: #1e1e1e;
                        padding: 20px;
                        border-radius: 4px;
                        border-left: 4px solid #f44336;
                    }
                    a {
                        color: #64b5f6;
                        text-decoration: none;
                    }
                </style>
            </head>
            <body>
                <h1>Error Loading Power Monitoring</h1>
                <div class="error">
                    <p><strong>Error:</strong> ${errorMessage}</p>
                </div>
                <p><a href="/ui/home">← Back to Home</a></p>
            </body>
            </html>
        `;
    }
}
