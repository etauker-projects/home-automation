export class PipelinePage {

    /**
     * Renders the Document Pipeline page: live stage counts, recent files with history, recent errors.
     * Data is polled from /ui/pipeline/{stats,files,errors}.
     * Failed files can be retried (POST /ui/pipeline/files/:id/retry), and an export run triggered (POST /ui/paperless/download).
     * @param refreshMs - How often the page polls for updates
     * @param paperlessUrl - Paperless base URL as reachable from the browser, for links to documents / tasks / inbox
     * @returns HTML string for the pipeline page
     */
    public static render(refreshMs: number = 5000, paperlessUrl: string = ''): string {
        const pollMs = Math.max(1000, Math.round(refreshMs));
        const paperlessBase = paperlessUrl.replace(/\/+$/, '');
        // safe to embed in <script>: JSON string with '<' escaped
        const paperlessJs = JSON.stringify(paperlessBase).replace(/</g, '\\u003c');
        const paperlessAttr = escapeHtml(paperlessBase);
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Document Pipeline</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    * { box-sizing: border-box; }
                    body {
                        background-color: #121212;
                        color: #e0e0e0;
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        margin: 0;
                    }
                    h1, h2 { color: #64b5f6; margin-bottom: 10px; }
                    h2 { font-size: 18px; margin-top: 0; }
                    nav {
                        margin: 20px 0;
                        padding-bottom: 20px;
                        border-bottom: 1px solid #333;
                        display: flex;
                        gap: 20px;
                    }
                    a { color: #64b5f6; text-decoration: none; }
                    a:hover { text-decoration: underline; }

                    .section {
                        background-color: #1e1e1e;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 8px;
                    }
                    .section-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: baseline;
                    }
                    .updated { font-size: 11px; color: #666; }

                    /* ── Stat Cards ─────────────────────────────── */
                    .stats-grid {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 15px;
                        margin-top: 15px;
                        align-items: stretch;
                    }
                    .stat-card {
                        background-color: #2a2a2a;
                        padding: 15px 25px;
                        border-radius: 8px;
                        min-width: 140px;
                        flex: 1;
                    }
                    .stat-arrow {
                        align-self: center;
                        color: #555;
                        font-size: 20px;
                    }
                    .stat-value { font-size: 28px; font-weight: bold; color: #64b5f6; }
                    .stat-value.warning { color: #ff9800; }
                    .stat-value.success { color: #4caf50; }
                    .stat-value.error { color: #f44336; }
                    .stat-value.muted { color: #666; }
                    .stat-label {
                        font-size: 12px;
                        color: #999;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        margin-top: 5px;
                    }
                    .stat-sub { font-size: 11px; color: #666; margin-top: 4px; }

                    /* ── Tables ─────────────────────────────────── */
                    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
                    th {
                        text-align: left;
                        color: #999;
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        padding: 6px 12px;
                        border-bottom: 1px solid #444;
                    }
                    td { padding: 6px 12px; border-bottom: 1px solid #333; vertical-align: top; }
                    tr.file-row { cursor: pointer; }
                    tr.file-row:hover { background-color: #2a2a2a; }
                    tr.history-row td { background-color: #181818; padding: 10px 24px; }
                    .empty { color: #666; font-style: italic; }
                    .badge {
                        display: inline-block;
                        padding: 2px 8px;
                        border-radius: 10px;
                        font-size: 11px;
                        background-color: #333;
                    }
                    .badge.scanned   { background-color: #37474f; }
                    .badge.consume   { background-color: #4527a0; }
                    .badge.paperless { background-color: #1565c0; }
                    .badge.exported  { background-color: #00695c; }
                    .badge.archived  { background-color: #2e7d32; }
                    .err-text { color: #f44336; }
                    .timeline { list-style: none; margin: 0; padding: 0; }
                    .timeline li { padding: 3px 0; font-size: 12px; }
                    .timeline .ts { color: #888; display: inline-block; min-width: 170px; }
                    .timeline .type { font-weight: bold; display: inline-block; min-width: 140px; }
                    .timeline .meta { color: #aaa; }
                    .ext::after { content: ' ↗'; font-size: 10px; }
                    .stat-sub a { color: #64b5f6; }
                    button {
                        background-color: #2a2a2a;
                        color: #64b5f6;
                        border: 1px solid #444;
                        border-radius: 4px;
                        padding: 3px 10px;
                        font-size: 12px;
                        cursor: pointer;
                    }
                    button:hover:not(:disabled) { background-color: #333; border-color: #64b5f6; }
                    button:disabled { color: #666; cursor: default; }
                    .header-actions { display: flex; gap: 12px; align-items: baseline; }
                    .action-msg {
                        display: none;
                        margin-top: 12px;
                        padding: 10px 16px;
                        border-left: 4px solid #4caf50;
                        background-color: #1e1e1e;
                    }
                    .action-msg.error { border-left-color: #f44336; color: #f44336; }
                    .error-banner {
                        display: none;
                        margin-top: 12px;
                        padding: 12px 16px;
                        border-left: 4px solid #f44336;
                        color: #f44336;
                        background-color: #1e1e1e;
                    }
                </style>
            </head>
            <body>
                <h1>Document Pipeline</h1>
                <nav>
                    <a href="/ui/home">← Home</a>
                    <a href="/ui/paperless">Paperless</a>
                    ${paperlessBase ? `<a class="ext" href="${paperlessAttr}/" target="_blank" rel="noopener">Open Paperless</a>` : ''}
                </nav>

                <div class="section">
                    <div class="section-header">
                        <h2>Stages</h2>
                        <div class="header-actions">
                            <span class="updated" id="statsUpdated">Loading…</span>
                            <button id="runExportBtn" title="Export everything changed in paperless since the last run (normally runs on a schedule)">Run export now</button>
                        </div>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value muted" id="statScanned">–</div>
                            <div class="stat-label">Scanned</div>
                            <div class="stat-sub">Waiting to stabilise / move</div>
                        </div>
                        <div class="stat-arrow">→</div>
                        <div class="stat-card">
                            <div class="stat-value muted" id="statConsume">–</div>
                            <div class="stat-label">Consume</div>
                            <div class="stat-sub">Awaiting paperless ingestion</div>
                            ${paperlessBase ? `<div class="stat-sub"><a class="ext" href="${paperlessAttr}/tasks" target="_blank" rel="noopener">Paperless tasks</a></div>` : ''}
                        </div>
                        <div class="stat-arrow">→</div>
                        <div class="stat-card">
                            <div class="stat-value muted" id="statPaperless">–</div>
                            <div class="stat-label">Paperless inbox</div>
                            <div class="stat-sub">Awaiting manual review</div>
                            ${paperlessBase ? `<div class="stat-sub"><a class="ext" href="${paperlessAttr}/documents?is_in_inbox=1" target="_blank" rel="noopener">Open inbox</a></div>` : ''}
                        </div>
                        <div class="stat-arrow">→</div>
                        <div class="stat-card">
                            <div class="stat-value muted" id="statExported">–</div>
                            <div class="stat-label">Exported</div>
                            <div class="stat-sub">Awaiting NAS backup</div>
                        </div>
                        <div class="stat-arrow">→</div>
                        <div class="stat-card">
                            <div class="stat-value muted" id="statArchived">–</div>
                            <div class="stat-label">Archived</div>
                            <div class="stat-sub">Tracked NAS backups</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value muted" id="statErrors">–</div>
                            <div class="stat-label">Errors (24h)</div>
                        </div>
                    </div>
                    <div class="error-banner" id="loadError"></div>
                    <div class="action-msg" id="actionMsg"></div>
                </div>

                <div class="section">
                    <h2>Recent files</h2>
                    <table>
                        <thead>
                            <tr><th>File</th><th>Stage</th><th>Last event</th><th>When</th><th>Events</th><th></th></tr>
                        </thead>
                        <tbody id="filesBody"><tr><td colspan="6" class="empty">Loading…</td></tr></tbody>
                    </table>
                </div>

                <div class="section">
                    <h2>Recent errors</h2>
                    <table>
                        <thead>
                            <tr><th>When</th><th>Stage</th><th>File</th><th>Error</th><th></th></tr>
                        </thead>
                        <tbody id="errorsBody"><tr><td colspan="5" class="empty">Loading…</td></tr></tbody>
                    </table>
                </div>

                <script>
                    const POLL_MS = ${pollMs};
                    const PAPERLESS_URL = ${paperlessJs};
                    const RETRY_LABELS = { move_to_consume: 'Retry move', export: 'Retry export', backup: 'Retry backup' };
                    const RETRY_TITLES = {
                        move_to_consume: 'Move the scan to the paperless consume directory again',
                        export: 'Export this document from paperless again',
                        backup: 'Back the exported file up to the NAS again',
                    };
                    const expanded = new Set();
                    const retrying = new Set();

                    function esc(value) {
                        return String(value ?? '').replace(/[&<>"']/g, c => ({
                            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
                        })[c]);
                    }

                    function fmtTime(iso) {
                        return iso ? new Date(iso).toLocaleString() : '–';
                    }

                    function setStat(id, value, cls) {
                        const el = document.getElementById(id);
                        el.textContent = value === null || value === undefined ? 'n/a' : value;
                        el.className = 'stat-value ' + (value === null || value === undefined ? 'muted' : cls);
                    }

                    async function getJson(url) {
                        const res = await fetch(url);
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || ('Request failed: ' + url));
                        return data;
                    }

                    function extLink(href, text) {
                        return '<a class="ext" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(text) + '</a>';
                    }

                    /** Link to a paperless document (or plain "#id" when no paperless URL is configured) */
                    function docLink(id) {
                        if (id === undefined || id === null) return '';
                        return PAPERLESS_URL ? extLink(PAPERLESS_URL + '/documents/' + encodeURIComponent(id) + '/details', '#' + id) : esc('#' + id);
                    }

                    function retryButton(fileId, action) {
                        if (!action) return '';
                        const busy = retrying.has(fileId);
                        return '<button data-retry="' + esc(fileId) + '" title="' + esc(RETRY_TITLES[action] || '') + '"' + (busy ? ' disabled' : '') + '>' +
                            (busy ? 'Retrying…' : esc(RETRY_LABELS[action] || 'Retry')) + '</button>';
                    }

                    function showAction(message, isError) {
                        const el = document.getElementById('actionMsg');
                        el.textContent = message;
                        el.className = 'action-msg' + (isError ? ' error' : '');
                        el.style.display = 'block';
                    }

                    async function postJson(url) {
                        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(data.error || ('Request failed: ' + url));
                        return data;
                    }

                    async function retryFile(fileId) {
                        if (retrying.has(fileId)) return;
                        retrying.add(fileId);
                        loadFiles().catch(() => {});
                        loadErrors().catch(() => {});
                        try {
                            const result = await postJson('/ui/pipeline/files/' + encodeURIComponent(fileId) + '/retry');
                            showAction(result.message, !result.success);
                        } catch (error) {
                            showAction('Retry failed: ' + error.message, true);
                        } finally {
                            retrying.delete(fileId);
                            refresh();
                        }
                    }

                    async function runExport() {
                        const btn = document.getElementById('runExportBtn');
                        btn.disabled = true;
                        btn.textContent = 'Exporting…';
                        try {
                            const d = await postJson('/ui/paperless/download');
                            showAction('Export finished: ' + d.successful + '/' + d.total + ' exported, ' + d.skipped + ' skipped, ' + d.failed + ' failed', d.failed > 0);
                        } catch (error) {
                            showAction('Export failed: ' + error.message, true);
                        } finally {
                            btn.disabled = false;
                            btn.textContent = 'Run export now';
                            refresh();
                        }
                    }

                    function pendingCls(n) { return n > 0 ? 'warning' : 'success'; }

                    async function loadStats() {
                        const s = await getJson('/ui/pipeline/stats');
                        setStat('statScanned', s.scanned, pendingCls(s.scanned));
                        setStat('statConsume', s.consume, pendingCls(s.consume));
                        setStat('statPaperless', s.paperlessInbox, pendingCls(s.paperlessInbox));
                        setStat('statExported', s.exported, pendingCls(s.exported));
                        setStat('statArchived', s.archivedTracked, 'success');
                        setStat('statErrors', s.errors24h, s.errors24h > 0 ? 'error' : 'success');
                        document.getElementById('statsUpdated').textContent = 'Updated ' + fmtTime(s.lastUpdated);
                    }

                    function renderTimeline(history) {
                        return '<ul class="timeline">' + history.map(e =>
                            '<li>' +
                                '<span class="ts">' + esc(fmtTime(e.ts)) + '</span>' +
                                '<span class="type' + (e.type === 'error' ? ' err-text' : '') + '">' + esc(e.type) + '</span>' +
                                '<span class="badge ' + esc(e.stage) + '">' + esc(e.stage) + '</span> ' +
                                '<span class="meta">' +
                                    (e.error ? '<span class="err-text">' + esc(e.error) + '</span> ' : '') +
                                    (e.details ? esc(e.details) + ' ' : '') +
                                    (e.path ? '— ' + esc(e.path) + ' ' : '') +
                                    (e.paperlessId !== undefined ? docLink(e.paperlessId) : '') +
                                '</span>' +
                            '</li>'
                        ).join('') + '</ul>';
                    }

                    async function loadFiles() {
                        const { files } = await getJson('/ui/pipeline/files?limit=50');
                        const body = document.getElementById('filesBody');
                        if (files.length === 0) {
                            body.innerHTML = '<tr><td colspan="6" class="empty">No files tracked yet</td></tr>';
                            return;
                        }

                        const histories = await Promise.all(files.map(f =>
                            expanded.has(f.fileId)
                                ? getJson('/ui/pipeline/files/' + encodeURIComponent(f.fileId)).then(d => d.history).catch(() => [])
                                : Promise.resolve(null)
                        ));

                        body.innerHTML = files.map((f, i) =>
                            '<tr class="file-row" data-id="' + esc(f.fileId) + '">' +
                                '<td>' + (expanded.has(f.fileId) ? '▾ ' : '▸ ') + esc(f.fileName) +
                                    (f.paperlessId !== undefined ? ' <span class="stat-sub">' + docLink(f.paperlessId) + '</span>' : '') + '</td>' +
                                '<td><span class="badge ' + esc(f.stage) + '">' + esc(f.stage) + '</span></td>' +
                                '<td class="' + (f.hasError ? 'err-text' : '') + '">' + esc(f.lastEvent) + '</td>' +
                                '<td>' + esc(fmtTime(f.lastEventAt)) + '</td>' +
                                '<td>' + esc(f.eventCount) + '</td>' +
                                '<td>' + retryButton(f.fileId, f.retryAction) + '</td>' +
                            '</tr>' +
                            (histories[i] ? '<tr class="history-row"><td colspan="6">' + renderTimeline(histories[i]) + '</td></tr>' : '')
                        ).join('');
                    }

                    async function loadErrors() {
                        const { errors } = await getJson('/ui/pipeline/errors?limit=50');
                        const body = document.getElementById('errorsBody');
                        if (errors.length === 0) {
                            body.innerHTML = '<tr><td colspan="5" class="empty">No errors recorded</td></tr>';
                            return;
                        }
                        body.innerHTML = errors.map(e =>
                            '<tr>' +
                                '<td>' + esc(fmtTime(e.ts)) + '</td>' +
                                '<td><span class="badge ' + esc(e.stage) + '">' + esc(e.stage) + '</span></td>' +
                                '<td>' + esc(e.fileName) + (e.paperlessId !== undefined ? ' <span class="stat-sub">' + docLink(e.paperlessId) + '</span>' : '') + '</td>' +
                                '<td class="err-text">' + esc(e.error) + (e.details ? ' <span class="stat-sub">' + esc(e.details) + '</span>' : '') +
                                    (e.stage === 'consume' && PAPERLESS_URL ? ' <span class="stat-sub">' + extLink(PAPERLESS_URL + '/tasks', 'Paperless tasks') + '</span>' : '') + '</td>' +
                                '<td>' + retryButton(e.fileId, e.retryAction) + '</td>' +
                            '</tr>'
                        ).join('');
                    }

                    async function refresh() {
                        const banner = document.getElementById('loadError');
                        const results = await Promise.allSettled([loadStats(), loadFiles(), loadErrors()]);
                        const failed = results.find(r => r.status === 'rejected');
                        if (failed) {
                            banner.textContent = 'Error refreshing: ' + failed.reason.message;
                            banner.style.display = 'block';
                        } else {
                            banner.style.display = 'none';
                        }
                    }

                    document.addEventListener('click', (ev) => {
                        const btn = ev.target.closest('button[data-retry]');
                        if (btn) retryFile(btn.dataset.retry);
                    });
                    document.getElementById('runExportBtn').addEventListener('click', runExport);

                    document.getElementById('filesBody').addEventListener('click', (ev) => {
                        if (ev.target.closest('a, button')) return; // links / retry don't expand the row
                        const row = ev.target.closest('tr.file-row');
                        if (!row) return;
                        const id = row.dataset.id;
                        if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
                        loadFiles().catch(() => {});
                    });

                    refresh();
                    setInterval(() => {
                        if (!document.hidden) refresh();
                    }, POLL_MS);
                </script>
            </body>
            </html>
        `;
    }

    /**
     * Renders an error page.
     * @param error - Error object or message
     * @returns HTML string for the error page
     */
    public static renderError(error: Error | string): string {
        const errorMessage = escapeHtml(error instanceof Error ? error.message : String(error));
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error – Document Pipeline</title>
                <style>
                    body { background-color: #121212; color: #e0e0e0; font-family: Arial, sans-serif; padding: 20px; }
                    .error {
                        color: #f44336;
                        background-color: #1e1e1e;
                        padding: 20px;
                        border-radius: 4px;
                        border-left: 4px solid #f44336;
                    }
                    a { color: #64b5f6; text-decoration: none; }
                </style>
            </head>
            <body>
                <h1>Error Loading Document Pipeline</h1>
                <div class="error"><p><strong>Error:</strong> ${errorMessage}</p></div>
                <p><a href="/ui/home">← Back to Home</a></p>
            </body>
            </html>
        `;
    }
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
