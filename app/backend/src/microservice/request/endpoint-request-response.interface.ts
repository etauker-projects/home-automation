export interface EndpointRequestResponse<T> {
    status: number;
    statusText: string;
    // headers: HttpHeaders;
    data: T;
}