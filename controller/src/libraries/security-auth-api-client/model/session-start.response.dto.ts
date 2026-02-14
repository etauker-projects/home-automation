export interface SessionStartResponseDto {
    session_id: string;
    user_id: string;
    jwt: string;
    issued_at: string;
    expires_at: string;
    invalidated_at: string | null;
    info: string;
}