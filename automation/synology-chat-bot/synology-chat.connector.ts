import axios from 'axios';
import express from 'express';
import { Agent } from 'https';


export type WebhookMessage = {
  token: string;
  user_id: string;
  username: string;
  post_id: string;
  thread_id: string;
  timestamp: string;
  text: string;
};

export interface SynologyChatConfig {
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

export class SynologyChatClient {
  public readonly config: SynologyChatConfig;
  private readonly app: express.Application;
  public _listening: boolean = false;

  constructor(config: SynologyChatConfig, app: express.Application) {
    this.config = config;
    this.app = app;
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

  async send(user: string, message: string): Promise<any> {
    const query = {
      api: 'SYNO.Chat.External',
      method: 'incoming',
      version: '2',
      token: this.config.sendToken,
    };

    const text = `*${user}:* ${message}`;
    const config: JsonRequest = {
      endpoint: this.config.sendEndpoint,
      method: 'post',
      query: query,
      body: `payload=${JSON.stringify({ text })}`,
      headers: {},
    }

    console.log(`[${user}] ${message}`);
    return this.submitJson(config);
  }

  listen(handler: (message: WebhookMessage) => void | Promise<void>) {
    this._listening = true;

    const stop = () => {
      this._listening = false;
      // TODO: close the app if needed
    };

    this.app.post('/synology-chat-home-assistant-bot/chat-webhook', async (req, res) => {
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
      // data: body,
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
