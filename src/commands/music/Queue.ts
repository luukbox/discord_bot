import { Message } from 'discord.js';
import { ICommand } from '../../message-broker/MessageBroker';
import ServerSession from '../../models/ServerSession';

export class QueueCommand implements ICommand {
  public commandString = 'queue';

  private serverStore: Map<string, ServerSession>;

  constructor(serverStore: Map<string, ServerSession>) {
    this.serverStore = serverStore;
  }

  public run(msg: Message) {
    const serverSession = this.serverStore.get(msg.guild.id);
    if (!serverSession) {
      return undefined;
    }
    return msg.channel.send(serverSession.getQueueEmbed());
  }
}
