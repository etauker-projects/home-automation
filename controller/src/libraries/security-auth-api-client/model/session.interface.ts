import { SessionMeta } from './session-meta.interface.js';

export interface Session {
    loggedIn: boolean;
    userId: string;
    userName: string;
    sessionId: string;
    meta: SessionMeta;
}