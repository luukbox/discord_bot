import { Message } from 'discord.js';
import { ICommand } from '../../message-broker/MessageBroker';
import ServerSession from '../../models/ServerSession';
import { isUserInVoiceChannel } from '../helpers';

export class PauseCommand implements ICommand {
  public commandString = 'pause';

  private serverStore: Map<string, ServerSession>;

  constructor(serverStore: Map<string, ServerSession>) {
    this.serverStore = serverStore;
  }

  public run(msg: Message) {
    const serverSession = this.serverStore.get(msg.guild.id);
    if (!serverSession) {
      return;
    }
    if (!isUserInVoiceChannel(msg)) {
      return msg.react('🤦');
    }
    return serverSession.pause(() => msg.react('⏸'));
  }
}
