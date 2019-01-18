import { Message } from 'discord.js';
import * as youtube from '../../apis/yt';
import { ICommand } from '../../message-broker/MessageBroker';
import ServerSession from '../../models/ServerSession';
import Song from '../../models/Song';
import { isPermissionsSet, isUserInVoiceChannel } from '../helpers';

export class PlayCommand implements ICommand {
  public commandString = 'play';
  private serverStore: Map<string, ServerSession>;

  constructor(serverStore: Map<string, ServerSession>) {
    this.serverStore = serverStore;
  }

  public async run(msg: Message) {
    const args = msg.content.split(' ');
    if (!isUserInVoiceChannel(msg)) {
      return msg.channel.send('Du bist in keinem Voice Channel..');
    }

    if (!isPermissionsSet(msg)) {
      return msg.channel.send('Ich hab keine Rechte für den VoiceChannel..');
    }

    // No Arguments provided
    if (args.length < 2) {
      return msg.react('🖕');
    }

    const serverSession = this.serverStore.get(msg.guild.id);

    let song: Song;

    try {
      // construct the url from the first argument
      const url = args[1].replace(/<(.+)>/g, '$1');
      // check if the url is a valid youtube url
      if (youtube.isYoutube(url)) {
        song = await youtube.getSongByURL(url);
      }
      // else construct a query string from all arguments and search youtube
      else {
        const query = args.slice(1).join(' ');
        song = await youtube.getSongByQuery(query);
      }
    } catch (error) {
      console.error(error);
      return msg.react('💩');
    }

    song.queuedBy = msg.author.toString();
    if (!serverSession) {
      const newServerSession = new ServerSession(
        msg.channel,
        msg.member.voiceChannel,
        msg.guild.id,
      );
      newServerSession.queue.push(song);
      try {
        const connection = await msg.member.voiceChannel.join();
        newServerSession.connection = connection;
        this.serverStore.set(msg.guild.id, newServerSession);
        this.play(msg.guild.id, newServerSession.queue[0]);
      } catch (error) {
        console.log(error);
        this.serverStore.delete(msg.guild.id);
        return msg.channel.send(`Error: ${error}`);
      }
    } else {
      serverSession.queue.push(song);
      return msg.react('👌');
    }
  }

  private play(guildID: string, song: Song) {
    const serverSession = this.serverStore.get(guildID);

    if (!song) {
      serverSession.voiceChannel.leave();
      this.serverStore.delete(guildID);
      return;
    }

    serverSession.connection
      .playStream(youtube.stream(song))
      .on('end', () => {
        this.play(guildID, serverSession.getNextSong());
      })
      .on('error', (error) => console.error(error));
    serverSession.setVolume();
    serverSession.textChannel.send(serverSession.getNowPlayingEmbed());
  }
}
