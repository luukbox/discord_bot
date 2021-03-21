import { Message } from 'discord.js';
import { ICommand } from '../../message-broker/MessageBroker';
import ServerSession from '../../models/ServerSession';
import { isUserInVoiceChannel } from '../helpers';

export class SkipCommand implements ICommand {
  public commandString = 'skip';

  private serverStore: Map<string, ServerSession>;

  constructor(serverStore: Map<string, ServerSession>) {
    this.serverStore = serverStore;
  }

  public run(msg: Message) {
    const serverSession = this.serverStore.get(msg.guild.id);
    if (!serverSession) {
      return undefined;
    }
    if (!isUserInVoiceChannel(msg)) {
      return msg.react('🤦');
    }
    const args = msg.content.split(' ');
    if (args[1]) {
      let amount = parseInt(args[1], 10);

      if (!isNaN(amount) && amount > 0) {
        if (amount > serverSession.queue.length) {
          amount = serverSession.queue.length;
        }
        serverSession.queue.splice(0, amount - 1);
      }
    }
    if (serverSession.connection.dispatcher) {
      serverSession.connection.dispatcher.end();
      return msg.react('👌');
    }
  }
}
