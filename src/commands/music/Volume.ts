import { Message } from 'discord.js';
import { ICommand } from '../../message-broker/MessageBroker';
import ServerSession from '../../models/ServerSession';
import { isUserInVoiceChannel } from '../helpers';

export class VolumeCommand implements ICommand {
  public commandString = 'volume';

  private serverStore: Map<string, ServerSession>;

  constructor(serverStore: Map<string, ServerSession>) {
    this.serverStore = serverStore;
  }

  public run(msg: Message) {
    const args = msg.content.split(' ');
    const serverSession = this.serverStore.get(msg.guild.id);
    if (!serverSession) {
      return undefined;
    }
    const volume = parseInt(args[1], 10);
    if (!volume) {
      return msg.reply(
        `Wir ballern grad auf ${serverSession.getVolume()}% \🔊`,
      );
    }
    if (!isUserInVoiceChannel(msg)) {
      return msg.react('🤦');
    }
    serverSession.setVolume(volume);
    return msg.react('👍');
  }
}
