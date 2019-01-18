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
    serverSession.connection.dispatcher.end();
    return msg.react('⏭');
  }
}
