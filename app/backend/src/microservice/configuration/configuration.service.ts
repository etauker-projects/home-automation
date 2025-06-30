export class ConfigurationService {

    private static instance: ConfigurationService;

    public static getInstance(): ConfigurationService {
        if (!ConfigurationService.instance) {
            ConfigurationService.instance = new ConfigurationService();
        }
        return ConfigurationService.instance;
    }

    /**
     * Checks if the application is currently running  in development mode.
     */
    public isInDevelopmentMode() {
        // eslint-disable-next-line no-process-env
        return process.env.MODE && process.env.MODE.toLowerCase() === 'development';
    }

    public getMode(): 'development' | 'production' {
        return this.isInDevelopmentMode() ? 'development' : 'production';
    }

}