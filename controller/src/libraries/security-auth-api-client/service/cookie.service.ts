export class CookieService {

    // ===========================================
    //               PROPERTIES
    // ===========================================
    private static PROD_HEADER_FINGERPRINT = '__Host-Fingerprint';
    
    private static DEV_HEADER_FINGERPRINT = 'Fingerprint';


    // ===========================================
    //             PUBLIC FUNCTIONS
    // ===========================================
    /**
     * Returns the name of the cookie which stores the security fingerprint.
     */
    public static getFingerprintCookieName(mode: string) {
        return mode.toLowerCase() === 'development'
            ? CookieService.DEV_HEADER_FINGERPRINT
            : CookieService.PROD_HEADER_FINGERPRINT;
    }
}
