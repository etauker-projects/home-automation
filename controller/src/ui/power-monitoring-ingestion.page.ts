export class PowerMonitoringIngestionPage {

    /**
     * Renders the Power Monitoring Data Ingestion page.
     * Exposes ingestion actions and shows processing statistics.
     * @returns HTML string for the ingestion page
     */
    public static render(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Power Monitoring – Data Ingestion</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
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
                    h1, h2 {
                        color: #64b5f6;
                        margin-bottom: 10px;
                    }
                    h2 {
                        font-size: 18px;
                        margin-top: 0;
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

                    /* ── Layout ─────────────────────────────────── */
                    .section {
                        background-color: #1e1e1e;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 8px;
                    }

                    /* ── Stat Cards ─────────────────────────────── */
                    .stats-grid {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 15px;
                        margin-top: 15px;
                    }
                    .stat-card {
                        background-color: #2a2a2a;
                        padding: 15px 25px;
                        border-radius: 8px;
                        min-width: 160px;
                        flex: 1;
                    }
                    .stat-value {
                        font-size: 28px;
                        font-weight: bold;
                        color: #64b5f6;
                    }
                    .stat-value.warning {
                        color: #ff9800;
                    }
                    .stat-value.success {
                        color: #4caf50;
                    }
                    .stat-value.muted {
                        color: #666;
                    }
                    .stat-label {
                        font-size: 12px;
                        color: #999;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        margin-top: 5px;
                    }
                    .stat-sub {
                        font-size: 11px;
                        color: #666;
                        margin-top: 4px;
                    }

                    /* ── Actions ────────────────────────────────── */
                    .actions-grid {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 20px;
                        margin-top: 10px;
                    }
                    .action-card {
                        background-color: #2a2a2a;
                        border-radius: 8px;
                        padding: 20px;
                        flex: 1;
                        min-width: 280px;
                    }
                    .action-card h3 {
                        color: #64b5f6;
                        margin: 0 0 8px 0;
                        font-size: 16px;
                    }
                    .action-card p {
                        color: #999;
                        font-size: 13px;
                        margin: 0 0 15px 0;
                        line-height: 1.5;
                    }

                    /* ── Form Controls ──────────────────────────── */
                    .form-row {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 12px;
                        margin-bottom: 15px;
                        align-items: flex-end;
                    }
                    .form-group {
                        display: flex;
                        flex-direction: column;
                        gap: 5px;
                    }
                    .form-group label {
                        font-size: 11px;
                        color: #999;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    input[type="text"],
                    input[type="number"] {
                        background-color: #1e1e1e;
                        color: #e0e0e0;
                        border: 1px solid #444;
                        padding: 8px 12px;
                        border-radius: 4px;
                        font-size: 14px;
                        width: 100px;
                    }
                    input[type="text"]:focus,
                    input[type="number"]:focus {
                        outline: none;
                        border-color: #64b5f6;
                        box-shadow: 0 0 0 2px rgba(100, 181, 246, 0.2);
                    }
                    input:disabled {
                        opacity: 0.4;
                        cursor: not-allowed;
                    }

                    /* ── Buttons ────────────────────────────────── */
                    .btn {
                        padding: 10px 24px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: bold;
                        transition: all 0.2s;
                        white-space: nowrap;
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
                    .btn-secondary {
                        background-color: #9575cd;
                        color: #121212;
                    }
                    .btn-secondary:hover {
                        background-color: #7e57c2;
                    }
                    .btn-secondary:disabled {
                        background-color: #424242;
                        color: #666;
                        cursor: not-allowed;
                    }
                    .btn-sm {
                        padding: 6px 14px;
                        font-size: 12px;
                    }

                    /* ── Status Messages ────────────────────────── */
                    .status-message {
                        padding: 12px 16px;
                        border-radius: 4px;
                        margin: 12px 0 0 0;
                        display: none;
                        font-size: 14px;
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

                    /* ── Results Table ──────────────────────────── */
                    .result-box {
                        margin-top: 15px;
                        display: none;
                    }
                    .result-box h4 {
                        color: #999;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        margin: 0 0 10px 0;
                    }
                    .result-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 13px;
                    }
                    .result-table td {
                        padding: 6px 12px;
                        border-bottom: 1px solid #333;
                        vertical-align: top;
                    }
                    .result-table td:first-child {
                        color: #999;
                        width: 40%;
                    }
                    .result-table td:last-child {
                        color: #e0e0e0;
                        font-weight: bold;
                    }

                    /* ── Tag ────────────────────────────────────── */
                    .tag {
                        display: inline-block;
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: bold;
                    }
                    .tag-green  { background-color: #1b3a1b; color: #4caf50; }
                    .tag-orange { background-color: #3a2b00; color: #ff9800; }
                    .tag-red    { background-color: #3a1212; color: #f44336; }
                    .tag-blue   { background-color: #0d2847; color: #64b5f6; }
                    .tag-grey   { background-color: #2a2a2a; color: #666; }

                    /* ── Divider ────────────────────────────────── */
                    .divider {
                        border: none;
                        border-top: 1px solid #333;
                        margin: 15px 0;
                    }
                </style>
            </head>
            <body>
                <nav>
                    <a href="/ui/home">← Back to Home</a>
                    <a href="/ui/power-monitoring">📊 View Charts</a>
                </nav>

                <h1>⚡ Power Monitoring – Data Ingestion</h1>

                <!-- ── Statistics ─────────────────────────────────────────── -->
                <div class="section">
                    <h2>📂 Storage Statistics</h2>
                    <div class="stats-grid" id="statsGrid">
                        <div class="stat-card">
                            <div class="stat-value muted" id="statInbox">–</div>
                            <div class="stat-label">Inbox Files</div>
                            <div class="stat-sub">CSV files awaiting processing</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value muted" id="statProcessed">–</div>
                            <div class="stat-label">Processed Files</div>
                            <div class="stat-sub">JSON files in processed dir</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value muted" id="statMetadata">–</div>
                            <div class="stat-label">Metadata Files</div>
                            <div class="stat-sub">Processing run records</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value muted" id="statHassStatus">–</div>
                            <div class="stat-label">HASS DB</div>
                            <div class="stat-sub" id="statHassSub">Checking…</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value muted" id="statHassEntities">–</div>
                            <div class="stat-label">HASS Entities</div>
                            <div class="stat-sub">Tracked in statistics_meta</div>
                        </div>
                    </div>
                    <div id="statsError" class="status-message error" style="margin-top: 15px;"></div>
                    <div style="margin-top: 12px;">
                        <button id="refreshStatsBtn" class="btn btn-sm btn-secondary">↻ Refresh</button>
                    </div>
                </div>

                <!-- ── Actions ─────────────────────────────────────────────── -->
                <div class="section">
                    <h2>🔧 Ingestion Actions</h2>
                    <div class="actions-grid">

                        <!-- Process CSV Inbox -->
                        <div class="action-card">
                            <h3>📥 Process Inbox Files</h3>
                            <p>
                                Parses all CSV files currently in the inbox directory (exported from
                                Home Assistant) and writes processed JSON files to the output directory.
                            </p>
                            <button id="processBtn" class="btn btn-primary">Run CSV Processing</button>
                            <div id="processStatus" class="status-message"></div>
                            <div id="processResult" class="result-box">
                                <h4>Result</h4>
                                <table class="result-table" id="processResultTable"></table>
                            </div>
                        </div>

                        <!-- Sync from HASS DB -->
                        <div class="action-card">
                            <h3>🗄️ Sync from HASS Database</h3>
                            <p>
                                Reads power statistics directly from the Home Assistant SQLite database
                                and writes processed JSON files for the selected period.
                            </p>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Year</label>
                                    <input type="text" id="syncYear" placeholder="e.g. 2025" maxlength="4">
                                </div>
                                <div class="form-group">
                                    <label>Month</label>
                                    <input type="text" id="syncMonth" placeholder="e.g. 07" maxlength="2">
                                </div>
                                <div class="form-group">
                                    <label>Day (optional)</label>
                                    <input type="text" id="syncDay" placeholder="e.g. 25" maxlength="2">
                                </div>
                            </div>
                            <button id="syncBtn" class="btn btn-primary" disabled>Sync from HASS DB</button>
                            <div id="syncStatus" class="status-message"></div>
                            <div id="syncResult" class="result-box">
                                <h4>Sync Result</h4>
                                <table class="result-table" id="syncResultTable"></table>
                            </div>
                        </div>

                    </div>
                </div>

                <script>
                    // ── State ──────────────────────────────────────────────────
                    let hassEnabled = false;

                    // ── Helpers ────────────────────────────────────────────────
                    function showMsg(el, message, type) {
                        el.textContent = message;
                        el.className = 'status-message ' + type;
                        el.style.display = 'block';
                        if (type !== 'loading') {
                            setTimeout(() => { el.style.display = 'none'; }, 8000);
                        }
                    }

                    function setStatValue(id, value, cssClass) {
                        const el = document.getElementById(id);
                        el.textContent = value;
                        el.className = 'stat-value' + (cssClass ? ' ' + cssClass : '');
                    }

                    function buildResultTable(tableEl, rows) {
                        tableEl.innerHTML = '';
                        rows.forEach(([label, value]) => {
                            const tr = document.createElement('tr');
                            const td1 = document.createElement('td');
                            const td2 = document.createElement('td');
                            td1.textContent = label;
                            if (typeof value === 'string' && value.startsWith('<')) {
                                td2.innerHTML = value;
                            } else {
                                td2.textContent = String(value ?? '–');
                            }
                            tr.appendChild(td1);
                            tr.appendChild(td2);
                            tableEl.appendChild(tr);
                        });
                    }

                    // ── Load Statistics ────────────────────────────────────────
                    async function loadStats() {
                        document.getElementById('refreshStatsBtn').disabled = true;
                        const statsError = document.getElementById('statsError');
                        statsError.style.display = 'none';

                        try {
                            const res = await fetch('/ui/power-monitoring/ingestion/stats');
                            const data = await res.json();

                            if (!res.ok) throw new Error(data.error || 'Failed to load stats');

                            // Inbox
                            const inboxCls = data.inboxCount > 0 ? 'warning' : 'success';
                            setStatValue('statInbox', data.inboxCount, inboxCls);

                            // Processed
                            setStatValue('statProcessed', data.processedCount,
                                data.processedCount > 0 ? 'success' : 'muted');

                            // Metadata
                            setStatValue('statMetadata', data.metadataCount, '');

                            // HASS status
                            hassEnabled = data.hassEnabled;
                            if (data.hassEnabled) {
                                setStatValue('statHassStatus', 'Connected', 'success');
                                document.getElementById('statHassSub').textContent = 'DB connector active';
                                setStatValue('statHassEntities', data.hassEntityCount, '');
                                document.getElementById('syncBtn').disabled = false;
                            } else {
                                setStatValue('statHassStatus', 'Disabled', 'muted');
                                document.getElementById('statHassSub').textContent = 'HASS_DB_PATH not set';
                                setStatValue('statHassEntities', 'N/A', 'muted');
                                document.getElementById('syncBtn').disabled = true;
                            }

                        } catch (err) {
                            statsError.textContent = 'Error loading statistics: ' + err.message;
                            statsError.style.display = 'block';
                        } finally {
                            document.getElementById('refreshStatsBtn').disabled = false;
                        }
                    }

                    // ── Set Default Dates ──────────────────────────────────────
                    function setDefaultDates() {
                        const now = new Date();
                        document.getElementById('syncYear').value = String(now.getFullYear());
                        document.getElementById('syncMonth').value = String(now.getMonth() + 1).padStart(2, '0');
                    }

                    // ── Process Inbox Files ────────────────────────────────────
                    const processBtn = document.getElementById('processBtn');
                    const processStatus = document.getElementById('processStatus');
                    const processResult = document.getElementById('processResult');
                    const processResultTable = document.getElementById('processResultTable');

                    processBtn.addEventListener('click', async () => {
                        processBtn.disabled = true;
                        processResult.style.display = 'none';
                        showMsg(processStatus, 'Processing inbox CSV files…', 'loading');

                        try {
                            const res = await fetch('/ui/power-monitoring/process', { method: 'POST' });
                            const data = await res.json();

                            if (res.ok && data.success) {
                                showMsg(processStatus, data.message || 'Processing complete.', 'success');
                                buildResultTable(processResultTable, [
                                    ['Status', '<span class="tag tag-green">Success</span>'],
                                    ['Message', data.message],
                                ]);
                                processResult.style.display = 'block';
                                // Refresh stats after processing
                                loadStats();
                            } else {
                                showMsg(processStatus, 'Error: ' + (data.error || 'Unknown error'), 'error');
                                buildResultTable(processResultTable, [
                                    ['Status', '<span class="tag tag-red">Failed</span>'],
                                    ['Error', data.error || 'Unknown error'],
                                ]);
                                processResult.style.display = 'block';
                            }
                        } catch (err) {
                            showMsg(processStatus, 'Request failed: ' + err.message, 'error');
                        } finally {
                            processBtn.disabled = false;
                        }
                    });

                    // ── Sync from HASS DB ──────────────────────────────────────
                    const syncBtn = document.getElementById('syncBtn');
                    const syncStatus = document.getElementById('syncStatus');
                    const syncResult = document.getElementById('syncResult');
                    const syncResultTable = document.getElementById('syncResultTable');

                    syncBtn.addEventListener('click', async () => {
                        const year  = document.getElementById('syncYear').value.trim();
                        const month = document.getElementById('syncMonth').value.trim();
                        const day   = document.getElementById('syncDay').value.trim();

                        if (!year || !month) {
                            showMsg(syncStatus, 'Please enter at least a year and month.', 'error');
                            return;
                        }

                        syncBtn.disabled = true;
                        syncResult.style.display = 'none';
                        const periodLabel = day ? \`\${year}-\${month}-\${day}\` : \`\${year}-\${month}\`;
                        showMsg(syncStatus, \`Syncing from HASS DB for \${periodLabel}…\`, 'loading');

                        try {
                            const body = { year, month };
                            if (day) body.day = day;

                            const res = await fetch('/ui/power-monitoring/sync', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(body),
                            });
                            const data = await res.json();

                            if (res.ok && data.success) {
                                showMsg(syncStatus, \`Sync complete. \${data.entriesExtracted} entries extracted, \${data.filesWritten} files written.\`, 'success');
                                buildResultTable(syncResultTable, [
                                    ['Status',            '<span class="tag tag-green">Success</span>'],
                                    ['Entries Extracted', data.entriesExtracted],
                                    ['Files Written',     data.filesWritten],
                                    ['Date Range (from)', data.dateRange?.from ?? '–'],
                                    ['Date Range (to)',   data.dateRange?.to ?? '–'],
                                ]);
                                syncResult.style.display = 'block';
                                // Refresh stats after sync
                                loadStats();
                            } else {
                                const errMsg = data.error || 'Unknown error';
                                showMsg(syncStatus, 'Sync failed: ' + errMsg, 'error');
                                buildResultTable(syncResultTable, [
                                    ['Status', '<span class="tag tag-red">Failed</span>'],
                                    ['Error',  errMsg],
                                ]);
                                syncResult.style.display = 'block';
                            }
                        } catch (err) {
                            showMsg(syncStatus, 'Request failed: ' + err.message, 'error');
                        } finally {
                            // Only re-enable if HASS is still connected
                            if (hassEnabled) syncBtn.disabled = false;
                        }
                    });

                    // ── Init ───────────────────────────────────────────────────
                    setDefaultDates();
                    loadStats();
                    document.getElementById('refreshStatsBtn').addEventListener('click', loadStats);
                </script>
            </body>
            </html>
        `;
    }

    /**
     * Renders an error page for the Power Monitoring Ingestion page.
     * @param error - The error that occurred
     * @returns HTML string for the error page
     */
    public static renderError(error: Error | string): string {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error – Power Monitoring Ingestion</title>
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
                <h1>Error Loading Power Monitoring Ingestion</h1>
                <div class="error">
                    <p><strong>Error:</strong> ${errorMessage}</p>
                </div>
                <p><a href="/ui/home">← Back to Home</a></p>
            </body>
            </html>
        `;
    }
}
