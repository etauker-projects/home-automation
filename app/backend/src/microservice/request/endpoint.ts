import axios, { AxiosRequestHeaders, AxiosResponse } from 'axios';
import { EndpointRequestResponse } from './endpoint-request-response.interface';

type SupportedMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface NotImplementedResponse { message: 'Method not implemented' }


// export class Endpoint<PayloadMap extends Partial<{ [key in SupportedMethod]: any | undefined }>> {

export class Endpoint {

    private headers: Record<string, string>;

    constructor(private url: string) {
        this.headers = {};
    }

    // // TODO: make payload dependent on method
    // async call<Method extends keyof PayloadMap, Res=any>(method: Method, payload: PayloadMap[Method]): Promise<RequestResponse<Res>> {
    //     try {
    //         return await this.get<Res>();
    //     } catch (error) {
    //         if (error?.response) {
    //             return Promise.resolve(this.mapResponse<any>(error.response));
    //         } else {
    //             throw error;
    //         }
    //     }
    // }

    public setHeaders(headers: Record<string, string>): Endpoint {
        this.headers = headers;
        return this;
    }

    async call<Res=any, Req=any>(
        method: SupportedMethod,
        payload?: Req,
    ): Promise<EndpointRequestResponse<Res>> {
        try {

            if (method === 'GET') {
                return await this.get(this.headers);
            } else if (method === 'POST') {
                return await this.post(payload, this.headers);
            } else if (method === 'PATCH') {
                return await this.patch(payload, this.headers);
            } else if (method === 'DELETE') {
                return await this.delete(this.headers);
            }

            throw new Error('Unsupported HTTP method provided');

        } catch (error) {
            if (error?.response) {
                return Promise.resolve(this.mapResponse<any>(error.response));
            } else {
                throw error;
            }
        }
    }

    private async get<Res>(headers: Record<string, string>): Promise<EndpointRequestResponse<Res>> {
        try {
            return await axios.get(this.url, { headers })
                .then((response: AxiosResponse<Res, any>) => this.mapResponse(response))
            ;
        } catch (error) {
            if (error?.response) {
                return Promise.resolve(this.mapResponse(error.response));
            } else {
                throw error;
            }
        }
    }

    private async post<Res, Req=any>(
        body: Req,
        headers: Record<string, string>,
    ): Promise<EndpointRequestResponse<Res>> {
        try {
            return await axios.post(this.url, body, { headers })
                .then((response: AxiosResponse<Res, any>) => this.mapResponse(response))
            ;
        } catch (error) {
            if (error?.response) {
                return Promise.resolve(this.mapResponse(error.response));
            } else {
                throw error;
            }
        }
    }

    private async patch<Res, Req=any>(
        body: Req,
        headers: Record<string, string>,
    ): Promise<EndpointRequestResponse<Res>> {
        try {
            return await axios.patch(this.url, body, { headers })
                .then((response: AxiosResponse<Res, any>) => this.mapResponse(response))
            ;
        } catch (error) {
            if (error?.response) {
                return Promise.resolve(this.mapResponse(error.response));
            } else {
                throw error;
            }
        }
    }

    private async delete<Res>(
        headers: Record<string, string>,
    ): Promise<EndpointRequestResponse<Res>> {
        try {
            return await axios.delete(this.url, { headers })
                .then((response: AxiosResponse) => this.mapResponse(response))
            ;
        } catch (error) {
            if (error?.response) {
                return Promise.resolve<any>(this.mapResponse(error.response));
            } else {
                throw error;
            }
        }
    }

    private mapResponse<Res>(axiosResponse: AxiosResponse<Res>): EndpointRequestResponse<Res> {
        return {
            status: axiosResponse.status,
            statusText: axiosResponse.statusText,
            data: axiosResponse.data,
            // headers: axiosResponse.headers,
        };
    }
}