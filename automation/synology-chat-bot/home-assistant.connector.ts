import axios from 'axios';
import express from 'express';
import { Agent } from 'https';


export type WebhookMessage = {
  device_id: string;
  device_name: string;
  state: string;
};

export interface HomeAssistantConfig {
  listenEndpoint: string;
  listenToken: string;

  sendEndpoint: string;
  sendToken: string;
  timeoutMs?: number;
}

export interface FormRequest {
  endpoint: string,
  method: string;
  query: { [key: string]: string };
  form?: any;
  headers: Record<string, string> | { [key: string]: string };
}

export interface JsonRequest {
  endpoint: string,
  method: string;
  query: { [key: string]: string };
  body?: any;
  headers: Record<string, string> | { [key: string]: string };
}

export class HomeAssistantClient {
  public readonly config: HomeAssistantConfig;
  public readonly server: express.Application;
  public _listening: boolean = false;

  constructor(config: HomeAssistantConfig, server: express.Application) {
    this.config = config;
    this.server = server;
  }

  public listening(): boolean {
    return this._listening;
  }

  async getUserList(onlyEnabled: boolean): Promise<any> {
    const query = {
      api: 'SYNO.Chat.External',
      method: 'user_list',
      version: '2',
      token: this.config.listenToken,
    };

    const config: FormRequest = {
      endpoint: this.config.listenEndpoint,
      method: 'get',
      query: query,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const response = await this.submitForm(config);
    const users = response.data?.users?.filter((user: any) => {
      return onlyEnabled ? !user.is_disabled : true;
    }) || [];

    // console.log('response:', users);
    return users;
  }

  async send(text: string): Promise<any> {
    const config: JsonRequest = {
      endpoint: this.config.sendEndpoint,
      method: 'post',
      query: {},
      body: { text },
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const response = await this.submitJson(config);
    return response;
  }

  listen(handler: (message: WebhookMessage) => void | Promise<void>) {
    this._listening = true;

    const stop = () => {
      this._listening = false;
      // TODO: close the app if needed
    };

    this.server.post('/synology-chat-home-assistant-bot/hass-webhook', async (req, res) => {
      if (!this._listening) return;

      try {
        const received: WebhookMessage = req.body;
        const response = await handler(received);
        res.status(200).send({ text: response });
      } catch (error) {
        console.error('Error handling Synology Chat message:', error);
        res.status(500).send('Error processing message');
      }
    });

    return { stop };
  }


  public async submitForm(request: FormRequest): Promise<any> {
    if (!request.endpoint) throw new Error("External endpoint not configured");

    const cfg = {
      url: request.endpoint,
      method: request.method,
      headers: {
        ...(request.headers || {}),
      },
      params: request.query,
      timeout: this.config.timeoutMs ?? 10000,
      form: request.form,
      httpsAgent: new Agent({
        rejectUnauthorized: false,
      }),
    };

    try {
      const res = await axios.request(cfg);
      return res.data;
    } catch (err: any) {
      const message = err?.response?.data || err?.message || String(err);
      throw new Error(`callApi error: ${message}`);
    }
  }


  public async submitJson(request: JsonRequest): Promise<any> {
    if (!request.endpoint) throw new Error("External endpoint not configured");

    const cfg = {
      url: request.endpoint,
      method: request.method,
      headers: {
        ...(request.headers || {}),
      },
      params: request.query,
      timeout: this.config.timeoutMs ?? 10000,
      data: request.body,
      httpsAgent: new Agent({
        rejectUnauthorized: false,
      }),
    };

    try {
      const res = await axios.request(cfg);
      return res.data;
    } catch (err: any) {
      const message = err?.response?.data || err?.message || String(err);
      throw new Error(`callApi error: ${message}`);
    }
  }
}
