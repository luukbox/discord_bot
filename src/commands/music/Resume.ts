import { Message } from 'discord.js';
import ServerSession from '../../models/ServerSession';
import { isUserInVoiceChannel } from '../helpers';

export class ResumeCommand {
  public commandString = 'resume';

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
    serverSession.resume(() => msg.react('▶'));
  }
}
