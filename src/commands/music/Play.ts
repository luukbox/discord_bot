import { Message } from 'discord.js';
import {
  fetchSpotifyPlaylistTracks,
  fetchSpotifyTrack,
  isSpotifyPlaylistUri,
  isSpotifyTrackUri,
  parseSpotifyIdFromUri,
} from '../../apis/spotify';
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

    let songs: Song[];

    try {
      if (isSpotifyTrackUri(args[1])) {
        const trackId = parseSpotifyIdFromUri(args[1]);
        const song = await fetchSpotifyTrack(trackId);
        songs = [song];
      } else if (isSpotifyPlaylistUri(args[1])) {
        const playlistId = parseSpotifyIdFromUri(args[1]);
        songs = await fetchSpotifyPlaylistTracks(playlistId);
        songs = songs.sort(() => Math.random() - 0.5); // shuffle songs
      } else {
        // construct the url from the first argument
        const url = args[1].replace(/<(.+)>/g, '$1');
        // check if the url is a valid youtube url
        if (youtube.isYoutube(url)) {
          const song = await youtube.getSongByURL(url);
          songs = [song];
        }
        // else construct a query string from all arguments and search youtube
        else {
          const query = args.slice(1).join(' ');
          const song = await youtube.getSongByQuery(query);
          songs = [song];
        }
      }
    } catch (error) {
      console.error(error);
      return msg.react('💩');
    }

    songs.forEach((song) => (song.queuedBy = msg.author.toString()));
    if (!serverSession) {
      const newServerSession = new ServerSession(
        msg.channel,
        msg.member.voiceChannel,
        msg.guild.id,
      );
      newServerSession.queue.push(...songs);
      try {
        const connection = await msg.member.voiceChannel.join();
        newServerSession.connection = connection;
        this.serverStore.set(msg.guild.id, newServerSession);
        await this.play(msg.guild.id, newServerSession.queue[0]);
      } catch (error) {
        console.log(error);
        this.serverStore.delete(msg.guild.id);
        return msg.channel.send(`${error}`);
      }
    } else {
      serverSession.queue.push(...songs);
      return msg.react('👌');
    }
  }

  private async play(guildID: string, song: Song): Promise<void> {
    const serverSession = this.serverStore.get(guildID);
    if (!song) {
      serverSession.voiceChannel.leave();
      this.serverStore.delete(guildID);
      return;
    }
    if (!song.resolved) {
      try {
        const resolvedYtSong = await youtube.getSongByQuery(song.title);
        song.id = resolvedYtSong.id;
        song.title = resolvedYtSong.title;
        song.url = resolvedYtSong.url;
        song.resolved = true;
      } catch (err) {
        console.log(err);
        this.play(guildID, serverSession.getNextSong());
        return;
      }
    }
    song.isPlaying = true;

    console.log(song);

    serverSession.connection
      .playStream(youtube.stream(song))
      .on('end', async () => {
        song.isPlaying = false;
        this.play(guildID, serverSession.getNextSong());
      })
      .on('error', (error) => console.error(error));

    serverSession.setVolume();
    const msgs = await serverSession.textChannel.send(
      serverSession.getNowPlayingEmbed(),
    );
    const msg = Array.isArray(msgs) ? msgs[0] : (msgs as Message);

    await msg.react('⏭');

    const filter = (reaction, user) => {
      return ['⏭'].includes(reaction.emoji.name) && user.id !== msg.author.id; // donÄt react on bot reactions
    };

    msg.awaitReactions(filter, { max: 1 }).then((collected) => {
      if (song.isPlaying) {
        song.isPlaying = false;
        serverSession.queue.slice(0, 1);
        serverSession.connection.dispatcher.end();
      }
      msg.react('👍');
    });
  }
}
