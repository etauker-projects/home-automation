import { SessionStartResponseDto } from './session-start.response.dto.js';

export interface StartResponse {
    dto: SessionStartResponseDto,
    headers:{ [key: string]: string[] };
}