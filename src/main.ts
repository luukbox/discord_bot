import { Client } from 'discord.js';
import { initSpotify } from './apis/spotify';
import {
  PauseCommand,
  PingCommand,
  PlayCommand,
  QueueCommand,
  ResumeCommand,
  SkipCommand,
  StopCommand,
  VolumeCommand,
} from './commands';
import { ShuffleCommand } from './commands/music/Shuffle';
import { DISCORD_TOKEN, PREFIX } from './config';
import { MessageBroker } from './message-broker/MessageBroker';
import ServerSession from './models/ServerSession';
const client = new Client({ disableEveryone: true });
const serverStore = new Map<string, ServerSession>();
const messageBroker = new MessageBroker(client, PREFIX);

const commands = [
  new PingCommand(),
  new PlayCommand(serverStore),
  new StopCommand(serverStore),
  new PauseCommand(serverStore),
  new ResumeCommand(serverStore),
  new QueueCommand(serverStore),
  new ShuffleCommand(serverStore),
  new SkipCommand(serverStore),
  new VolumeCommand(serverStore),
];

// add the commands
commands.forEach((c) => messageBroker.addCommand(c));

initSpotify().then(() => client.login(DISCORD_TOKEN));
