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
                    nav {
                        margin: 20px 0;
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
                <nav>
                    <a href="/ui/paperless">View Paperless Documents</a> |
                    <a href="/auth/logout">Logout</a>
                </nav>
            </body>
            </html>
        `;
    }
}
