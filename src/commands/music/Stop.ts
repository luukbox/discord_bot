import { Message } from 'discord.js';
import { ICommand } from '../../message-broker/MessageBroker';
import ServerSession from '../../models/ServerSession';
import { isUserInVoiceChannel } from '../helpers';

export class StopCommand implements ICommand {
  public commandString = 'stop';
  private serverStore: Map<string, ServerSession>;

  constructor(serverStore: Map<string, ServerSession>) {
    this.serverStore = serverStore;
  }

  public async run(msg: Message) {
    const serverSession = this.serverStore.get(msg.guild.id);
    if (!serverSession) {
      return;
    }
    if (!isUserInVoiceChannel(msg)) {
      msg.react('🤦');
      return;
    }
    if (serverSession.playing) {
      serverSession.queue = [];
      serverSession.connection.dispatcher.end();
      msg.react('👌');
    }
  }
}
