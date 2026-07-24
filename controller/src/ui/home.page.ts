export class HomePage {

    /**
     * Renders the main home page.
     * @returns HTML string for the home page
     */
    public static render(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Home</title>
                <style>
                    body {
                        background-color: #121212;
                        color: #e0e0e0;
                        font-family: Arial, sans-serif;
                        padding: 20px;
                    }
                    h1 {
                        color: #64b5f6;
                    }
                    .panels-container {
                        display: flex;
                        gap: 20px;
                        margin: 40px 0;
                        flex-wrap: wrap;
                    }
                    .panel {
                        width: 200px;
                        height: 200px;
                        background-color: #1e1e1e;
                        border-radius: 8px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-decoration: none;
                        color: #e0e0e0;
                        transition: all 0.3s ease;
                        border: 2px solid #2a2a2a;
                        cursor: pointer;
                    }
                    .panel:hover {
                        background-color: #2a2a2a;
                        border-color: #64b5f6;
                        transform: translateY(-4px);
                        box-shadow: 0 6px 20px rgba(100, 181, 246, 0.3);
                    }
                    .panel-icon {
                        font-size: 48px;
                        margin-bottom: 15px;
                    }
                    .panel-title {
                        font-size: 16px;
                        font-weight: bold;
                        text-align: center;
                        color: #64b5f6;
                    }
                    .logout-link {
                        margin-top: 20px;
                        display: inline-block;
                    }
                    a {
                        color: #64b5f6;
                        text-decoration: none;
                    }
                    a:hover {
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <h1>Home Page</h1>
                <p>You are logged in!</p>
                
                <div class="panels-container">
                    <a href="/ui/paperless" class="panel">
                        <div class="panel-icon">📄</div>
                        <div class="panel-title">View Paperless Documents</div>
                    </a>
                    <a href="/ui/power-monitoring" class="panel">
                        <div class="panel-icon">⚡</div>
                        <div class="panel-title">Power Monitoring</div>
                    </a>
                </div>
                
                <div class="logout-link">
                    <a href="/auth/logout">Logout</a>
                </div>
            </body>
            </html>
        `;
    }
}
