import { Message } from 'discord.js';
import { ICommand } from '../../message-broker/MessageBroker';
import ServerSession from '../../models/ServerSession';
import { isUserInVoiceChannel } from '../helpers';

export class LeaveCommand implements ICommand {
  public commandString = 'leave';

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
    msg.react('👌');
    serverSession.voiceChannel.leave();
    this.serverStore.delete(serverSession.guildID);
  }
}
