export class PaperlessPage {

    /**
     * Renders the main Paperless documents page.
     * @param lastDownloaded - The timestamp of the last document download
     * @returns HTML string for the main page
     */
    public static render(lastDownloaded: string, paperlessUrl: string = ''): string {
        // safe to embed in <script>: JSON string with '<' escaped
        const paperlessJs = JSON.stringify(paperlessUrl.replace(/\/+$/, '')).replace(/</g, '\\u003c');
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Paperless Documents</title>
                <style>
                    body {
                        background-color: #121212;
                        color: #e0e0e0;
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        margin: 0 auto;
                    }
                    h1 {
                        color: #64b5f6;
                    }
                    nav {
                        margin: 20px 0;
                        padding-bottom: 20px;
                        border-bottom: 1px solid #333;
                    }
                    a {
                        color: #64b5f6;
                        text-decoration: none;
                    }
                    a:hover {
                        text-decoration: underline;
                    }
                    .table-container {
                        overflow-x: auto;
                        margin: 20px 0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        background-color: #1e1e1e;
                        min-width: 1400px;
                    }
                    th, td {
                        padding: 12px;
                        text-align: left;
                        border-bottom: 1px solid #333;
                        vertical-align: top;
                    }
                    th {
                        background-color: #2a2a2a;
                        color: #64b5f6;
                        font-weight: bold;
                        position: sticky;
                        top: 0;
                        z-index: 10;
                    }
                    tr:hover {
                        background-color: #252525;
                    }
                    .info-box {
                        background-color: #1e1e1e;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                        border-left: 4px solid #64b5f6;
                    }
                    .action-buttons {
                        margin: 20px 0;
                        display: flex;
                        gap: 10px;
                        align-items: center;
                    }
                    .btn {
                        padding: 10px 20px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: bold;
                        transition: background-color 0.3s;
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
                        cursor: not-allowed;
                    }
                    .status-message {
                        padding: 10px 15px;
                        border-radius: 4px;
                        margin: 10px 0;
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
                </style>
            </head>
            <body>
                <nav>
                    <a href="/ui/home">← Back to Home</a>
                </nav>
                <h1>Paperless Documents Injested Since ${lastDownloaded}</h1>
                <div class="info-box">
                    <strong>Note:</strong> Raw data is logged to the browser console. Press F12 to open developer tools.
                </div>

                <div class="action-buttons">
                    <button id="previewBtn" class="btn btn-primary">Preview</button>
                    <button id="downloadBtn" class="btn btn-primary">Export</button>
                </div>

                <div id="statusMessage" class="status-message"></div>

                <div id="tableContainer" class="table-container" style="display: none;">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Correspondent</th>
                                <th>Document Type</th>
                                <th>Tags</th>
                                <th>Created Date</th>
                                <th>Pages</th>
                                <th>Mime Type</th>
                                <th>Path</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody">
                            <!-- Documents will be loaded here -->
                        </tbody>
                    </table>
                </div>

                <script>
                    const PAPERLESS_URL = ${paperlessJs};
                    /** Document ID, linked to the document in paperless when its URL is known */
                    function paperlessLink(id) {
                        if (!id) return '<em>N/A</em>';
                        const safeId = encodeURIComponent(id);
                        return PAPERLESS_URL
                            ? '<a href="' + PAPERLESS_URL + '/documents/' + safeId + '/details" target="_blank" rel="noopener">#' + safeId + ' ↗</a>'
                            : '#' + safeId;
                    }

                    const statusMessage = document.getElementById('statusMessage');
                    const previewBtn = document.getElementById('previewBtn');
                    const downloadBtn = document.getElementById('downloadBtn');
                    const tableContainer = document.getElementById('tableContainer');
                    const tableBody = document.getElementById('tableBody');

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

                    function disableButtons() {
                        previewBtn.disabled = true;
                        downloadBtn.disabled = true;
                    }

                    function enableButtons() {
                        previewBtn.disabled = false;
                        downloadBtn.disabled = false;
                    }

                    previewBtn.addEventListener('click', async () => {
                        disableButtons();
                        showMessage('Loading documents...', 'loading');

                        try {
                            const response = await fetch('/ui/paperless/preview', {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });

                            const data = await response.json();

                            if (response.ok && data.documents) {
                                // Clear existing rows
                                tableBody.innerHTML = '';

                                // Generate and insert new rows
                                data.documents.forEach(doc => {
                                    const tagsDisplay = doc.tags && doc.tags.length > 0
                                        ? doc.tags.join(', ')
                                        : '<em>None</em>';

                                    const row = document.createElement('tr');
                                    row.innerHTML = \`
                                        <td>\${paperlessLink(doc.paperlessId)}</td>
                                        <td>\${doc.title || '<em>N/A</em>'}</td>
                                        <td>\${doc.correspondent || '<em>N/A</em>'}</td>
                                        <td>\${doc.documentType || '<em>N/A</em>'}</td>
                                        <td>\${tagsDisplay}</td>
                                        <td>\${doc.created || '<em>N/A</em>'}</td>
                                        <td>\${doc.pageCount || 0}</td>
                                        <td>\${doc.mimeType || '<em>N/A</em>'}</td>
                                        <td>\${doc.path || '<em>N/A</em>'}</td>
                                    \`;
                                    tableBody.appendChild(row);
                                });

                                // Show the table
                                tableContainer.style.display = 'block';
                                showMessage(\`Loaded \${data.documents.length} documents\`, 'success');
                                console.log('Paperless Documents Data:', data.documents);
                            } else {
                                showMessage('Preview failed: ' + (data.error || 'Unknown error'), 'error');
                            }
                        } catch (error) {
                            showMessage('Preview failed: ' + error.message, 'error');
                        } finally {
                            enableButtons();
                        }
                    });

                    downloadBtn.addEventListener('click', async () => {
                        disableButtons();
                        showMessage('Exporting documents...', 'loading');

                        try {
                            const response = await fetch('/ui/paperless/download', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });

                            const data = await response.json();

                            if (response.ok) {
                                const skippedMsg = data.skipped > 0 ? \` \${data.skipped} skipped.\` : '';
                                const failedMsg = data.failed > 0 ? \` \${data.failed} failed.\` : '';
                                const summary = \`Exported \${data.successful}/\${data.total} documents successfully.\${skippedMsg}\${failedMsg}\`;
                                showMessage(summary, data.failed > 0 ? 'error' : 'success');
                                console.log('Download Summary:', data);
                            } else {
                                showMessage('Export failed: ' + (data.error || 'Unknown error'), 'error');
                            }
                        } catch (error) {
                            showMessage('Export failed: ' + error.message, 'error');
                        } finally {
                            enableButtons();
                        }
                    });

                </script>
            </body>
            </html>
        `;
    }

    /**
     * Renders an error page for the Paperless documents page.
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
                <h1>Error Loading Paperless Documents</h1>
                <div class="error">
                    <p><strong>Error:</strong> ${errorMessage}</p>
                </div>
                <p><a href="/ui/home">← Back to Home</a></p>
            </body>
            </html>
        `;
    }
}
