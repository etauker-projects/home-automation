export class PowerMonitoringPage {

    /**
     * Renders the main Power Monitoring page.
     * @returns HTML string for the power monitoring page
     */
    public static render(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Power Monitoring</title>
                <style>
                    body {
                        background-color: #121212;
                        color: #e0e0e0;
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        margin: 0 auto;
                        max-width: 1200px;
                    }
                    h1 {
                        color: #64b5f6;
                    }
                    h2 {
                        color: #64b5f6;
                        margin-top: 30px;
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
                    .info-box {
                        background-color: #1e1e1e;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 4px;
                        border-left: 4px solid #64b5f6;
                    }
                    .placeholder-content {
                        background-color: #1e1e1e;
                        padding: 30px;
                        margin: 30px 0;
                        border-radius: 8px;
                        text-align: center;
                        border: 2px dashed #2a2a2a;
                    }
                    .placeholder-icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                    }
                    .feature-list {
                        background-color: #1e1e1e;
                        padding: 20px 30px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .feature-list ul {
                        list-style-type: none;
                        padding: 0;
                    }
                    .feature-list li {
                        padding: 10px 0;
                        border-bottom: 1px solid #2a2a2a;
                    }
                    .feature-list li:last-child {
                        border-bottom: none;
                    }
                    .feature-list li::before {
                        content: "⚡ ";
                        color: #64b5f6;
                        font-size: 1.2em;
                        margin-right: 10px;
                    }
                </style>
            </head>
            <body>
                <nav>
                    <a href="/ui/home">← Back to Home</a>
                </nav>
                <h1>Power Monitoring</h1>
                
                <div class="info-box">
                    <strong>Status:</strong> This page is currently under development. Power monitoring features will be added in future updates.
                </div>

                <div class="placeholder-content">
                    <div class="placeholder-icon">⚡</div>
                    <h2>Coming Soon</h2>
                    <p>Power monitoring and energy management features are being developed.</p>
                </div>

                <h2>Planned Features</h2>
                <div class="feature-list">
                    <ul>
                        <li>Real-time power consumption monitoring</li>
                        <li>Historical energy usage statistics and trends</li>
                        <li>Device-level power tracking</li>
                        <li>Energy cost calculations and billing estimates</li>
                        <li>Smart device control and automation</li>
                        <li>Energy usage alerts and notifications</li>
                    </ul>
                </div>
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
