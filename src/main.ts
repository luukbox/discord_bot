import { Client } from 'discord.js';

import { DISCORD_TOKEN } from './config';
import messageHandler from './messageHandler';

const client = new Client({ disableEveryone: true });

client.on('ready', () => {
  console.log('LuukBox is ready..');
});

client.on('disconnect', () => {
  console.log('LuukBox disconnected, will reconnect now...');
});

client.on('reconnecting', () => {
  console.log('Reconnecting...');
});

client.on('warn', console.warn);

client.on('error', console.error);

client.on('message', (msg) => {
  messageHandler(msg);
});

client.login(DISCORD_TOKEN);
