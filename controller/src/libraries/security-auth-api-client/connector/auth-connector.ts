import { default as axios } from 'axios';
import { CookieService } from '../service/cookie.service.js';
import { ILogger } from '../model/logger.interface.js';
import { SessionStartRequestDto } from '../model/session-start.request.dto.js';
import { SessionStartResponseDto } from '../model/session-start.response.dto.js';
import { StartResponse } from '../model/start.response.js';

export class AuthConnector {

    private readonly host: string;
    private readonly logger: ILogger;

    constructor(host: string, logger: ILogger) {
        this.logger = logger;
        this.host = host;
    }

    public async invalidateSession(
        sessionId: string,
        mode: string,
        token: string,
        fingerprintCookie: string,
    ): Promise<string> {

        try {
            const endpoint = `/security/auth/api/v1/sessions/${ sessionId }/end`;
            const cookieName = CookieService.getFingerprintCookieName(mode);

            const headers = {
                Authorization: 'bearer ' + token,
                cookie: `${ cookieName }=${ fingerprintCookie }`
            };

            this.logger.debug('[AuthConnector] making call to end session "' + endpoint + '"');
            const response = await axios.post(this.host + endpoint, '', { headers });
            this.logger.debug('[AuthConnector] session end call successful');
            return response.data;

        } catch (error) {
            this.logger.debug('[AuthConnector] session end call unsuccessful', '', error);
            const httpError = error?.response?.data;
            if (httpError) throw httpError;
            throw error;
        }
    }

    public async startSession(username: string, passwordBase64: string): Promise<StartResponse> {
        try {
            const endpoint = '/security/auth/api/v1/sessions/start';
            const body: SessionStartRequestDto = {
                username,
                password: passwordBase64,
            };

            this.logger.debug('[AuthConnector] making call to start session');
            const response = await axios.post<SessionStartResponseDto>(this.host + endpoint, body);
            this.logger.debug('[AuthConnector] session start call successful');
            const headers = {
                'set-cookie': response.headers['set-cookie'] || []
            };
            return { dto: response.data, headers };

        } catch (error) {
            this.logger.debug('[AuthConnector] session start call unsuccessful', '', error);
            const httpError = error?.response?.data;
            if (httpError) throw httpError;
            throw error;
        }
    }
}