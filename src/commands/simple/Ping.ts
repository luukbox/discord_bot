import { Message } from 'discord.js';
import { INSULTS } from '../../config';
import { ICommand } from '../../message-broker/MessageBroker';

export class PingCommand implements ICommand {
  public commandString = 'ping';

  public async run(msg: Message) {
    const insult = INSULTS[Math.floor(Math.random() * INSULTS.length)];
    msg.channel.send(
      `PONG du ${insult}! (${Date.now() - msg.createdAt.getTime()}ms)`,
    );
  }
}
