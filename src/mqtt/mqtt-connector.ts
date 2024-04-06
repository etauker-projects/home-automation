import { connect, type IClientOptions, type MqttClient } from 'mqtt';

export class MqttConnector {

    private connected: Promise<MqttClient>;

    constructor(host: string, username: string, password: string) {
        const brokerUrl: string = host;
        const opts: IClientOptions = { username, password };
        const client = connect(brokerUrl, opts);
        this.connected = new Promise((resolve) => {
            client.on('connect', () => {
               resolve(client);
            });
            client.on('error', (error) => {
                this.connected = Promise.reject(error);
            });
        })
    }

    public async subscribe(topic: string, messageHandler: (message: string) => void): Promise<MqttConnector> {
        return this.connected.then(client => {
            return new Promise((resolve, reject) => {
                client.on('message', (topic: string, message: Buffer) => {
                    messageHandler(message.toString());
                });

                client.subscribe(topic, (error) => error ? reject(error) : resolve(this));
            });
        });
    }

    public async publish(topic: string, message: string): Promise<MqttConnector> {
        return this.connected.then(client => {
            client.publish(topic, message);
            return this;
        });
    }
}