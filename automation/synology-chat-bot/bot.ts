import dotenv from "dotenv";
import express from "express";
import { SynologyChatClient, type WebhookMessage as SynologyWebhookMessage } from './synology-chat.connector.ts';
import { HomeAssistantClient, type WebhookMessage as HassWebhookMessage } from './home-assistant.connector.ts';


dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const synology = new SynologyChatClient({
  listenEndpoint: process.env.SYNOLOGY_CHAT_WEBHOOK || '',
  listenToken: process.env.SYNOLOGY_CHAT_TOKEN || '',
  sendEndpoint: process.env.SYNOLOGY_CHAT_INCOMING_WEBHOOK_ENDPOINT || '',
  sendToken: process.env.SYNOLOGY_CHAT_INCOMING_WEBHOOK_TOKEN || '',
}, app);

const hass = new HomeAssistantClient({
  sendEndpoint: process.env.HOME_ASSISTANT_INCOMING_WEBHOOK_ENDPOINT || '',
  sendToken: process.env.HOME_ASSISTANT_INCOMING_WEBHOOK_TOKEN || '',
  listenEndpoint: process.env.HOME_ASSISTANT_OUTGOING_WEBHOOK_ENDPOINT || '',
  listenToken: process.env.HOME_ASSISTANT_OUTGOING_WEBHOOK_TOKEN || '',
}, app);

hass.listen(async (message: HassWebhookMessage) => {
  setTimeout(async () => {
    const value = `${message.device_name} is ${message.state}`;
    await synology.send('Home Assistant', value);
  }, 1000);
});

synology.listen(async (message: SynologyWebhookMessage) => {
  // const users = await synology.getUserList(true);
  // const userIds = users.filter(u => u.username === 'Tautvydas').map((u: any) => u.user_id);
  await synology.send(message.username, message.text);
  await hass.send(message.text);
});

app.listen(4000, () => {
  console.log('Synology Chat Bot listening on port 4000');
});

while (hass.listening() || synology.listening()) {
  await new Promise(resolve => setTimeout(resolve, 60 * 1000));
}

// `cd ~/workspace/etauker/home-automation/automation/synology-chat-bot &&npm run start  >/dev/null 2>&1 < /dev/null &`