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

  public async run(msg: Message): Promise<void> {
    const args = msg.content.split(' ');
    if (!isUserInVoiceChannel(msg)) {
      msg.channel.send('Du bist in keinem Voice Channel..');
      return;
    }

    if (!isPermissionsSet(msg)) {
      msg.channel.send('Ich hab keine Rechte für den VoiceChannel..');
      return;
    }

    // No Arguments provided
    if (args.length < 2) {
      msg.react('🖕');
      return;
    }

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
      msg.react('💩');
      return;
    }

    songs.forEach((song) => (song.queuedBy = msg.author.toString()));

    if (!this.serverStore.has(msg.guild.id)) {
      const newServerSession = new ServerSession(
        msg.channel,
        msg.member.voiceChannel,
        msg.guild.id,
      );
      try {
        const connection = await msg.member.voiceChannel.join();
        newServerSession.connection = connection;
        this.serverStore.set(msg.guild.id, newServerSession);
      } catch (error) {
        console.log(error);
        this.serverStore.delete(msg.guild.id);
        msg.channel.send(`${error}`);
        return;
      }
    }

    const serverSession = this.serverStore.get(msg.guild.id);

    serverSession.queue.push(...songs);

    if (!serverSession.playing) {
      this.play(msg.guild.id, serverSession.queue[0]);
    }
    msg.react('👌');
  }

  private onDispatcherStart(song: Song, serverSession: ServerSession): void {
    serverSession.playing = true;
    song.isPlaying = true;
    serverSession.connection.dispatcher &&
      serverSession.connection.dispatcher.setVolume(1);
    serverSession.textChannel
      .send(serverSession.getNowPlayingEmbed())
      .then((msgs) => {
        const msg = Array.isArray(msgs) ? msgs[0] : (msgs as Message);
        return msg.react('⏭');
      })
      .then((msgReaction) => {
        const msg = msgReaction.message;

        msg
          .awaitReactions(
            (reaction, user) =>
              ['⏭'].includes(reaction.emoji.name) &&
              user.id !== msg.author.id /* dont react on bot reactions*/,
            { max: 1 },
          )
          .then((collected) => {
            if (song.isPlaying) {
              song.isPlaying = false;
              serverSession.queue.slice(0, 1);
              serverSession.connection.dispatcher.end();
            }
            msg.react('👌');
          });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  private onDispatcherEnd(song: Song, serverSession: ServerSession): void {
    song.isPlaying = false;
    this.play(serverSession.guildID, serverSession.getNextSong());
  }

  private async play(guildID: string, song: Song): Promise<void> {
    const serverSession = this.serverStore.get(guildID);

    if (!song) {
      serverSession.playing = false;
      serverSession.queueChannelLeave(() => this.serverStore.delete(guildID));
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

    serverSession.connection
      .playStream(youtube.stream(song))
      .on('start', () => this.onDispatcherStart(song, serverSession))
      .on('end', () => this.onDispatcherEnd(song, serverSession))
      .on('error', (error) => console.error(error));
  }
}
