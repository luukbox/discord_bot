import { Message } from 'discord.js';
import { ICommand } from '../../message-broker/MessageBroker';

export class PingCommand implements ICommand {
  public commandString = 'ping';

  public async run(msg: Message) {
    msg.channel.send(`pong (${Date.now() - msg.createdAt.getTime()}ms)`);
  }
}
