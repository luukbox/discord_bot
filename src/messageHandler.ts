import { Message } from 'discord.js';
import * as youtube from './apis/yt';
import { INSULTS, PREFIX, YOUTUBE_API_KEY } from './config';
import ServerSession from './models/ServerSession';
import Song from './models/Song';

const sessions: Map<string, ServerSession> = new Map();

export default async function(msg: Message) {
  if (msg.author.bot || !msg.content.startsWith(PREFIX)) {
    return;
  }

  console.log(msg.content);

  const serverSession = sessions.get(msg.guild.id);

  const insult = INSULTS[Math.floor(Math.random() * INSULTS.length)];

  // get the arguments
  const args = msg.content.split(' ');

  // PING
  if (msg.content.startsWith(`${PREFIX}ping`)) {
    return msg.channel.send(
      `PONG du ${insult}! (${Date.now() - msg.createdAt.getTime()}ms)`,
    );
  }
  // PLAY
  else if (msg.content.startsWith(`${PREFIX}play`)) {
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
        sessions.set(msg.guild.id, newServerSession);
        play(msg.guild.id, newServerSession.queue[0]);
      } catch (error) {
        console.log(error);
        sessions.delete(msg.guild.id);
        return msg.channel.send(`Error: ${error}`);
      }
    } else {
      serverSession.queue.push(song);
      return msg.react('👌');
    }
  }
  // STOP
  else if (msg.content.startsWith(`${PREFIX}stop`)) {
    if (!serverSession) {
      return undefined;
    }
    if (!isUserInVoiceChannel(msg)) {
      return msg.react('🤦');
    }
    serverSession.queue = [];
    serverSession.connection.dispatcher.end();
    return msg.react('⏹');
  }
  // PAUSE
  else if (msg.content.startsWith(`${PREFIX}pause`)) {
    if (!serverSession) {
      return undefined;
    }
    if (!isUserInVoiceChannel(msg)) {
      return msg.react('🤦');
    }
    return serverSession.pause(() => msg.react('⏸'));
  }
  // RESUME
  else if (msg.content.startsWith(`${PREFIX}resume`)) {
    if (!serverSession) {
      return undefined;
    }
    if (!isUserInVoiceChannel(msg)) {
      return msg.react('🤦');
    }
    serverSession.resume(() => msg.react('▶'));
  }
  // VOLUME
  else if (msg.content.startsWith(`${PREFIX}volume`)) {
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
  } else if (msg.content.startsWith(`${PREFIX}skip`)) {
    if (!serverSession) {
      return undefined;
    }
    if (!isUserInVoiceChannel(msg)) {
      return msg.react('🤦');
    }
    serverSession.connection.dispatcher.end();
    return msg.react('⏭');
  }
  // QUEUE
  else if (msg.content.startsWith(`${PREFIX}queue`)) {
    if (!serverSession) {
      return undefined;
    }
    return msg.channel.send(serverSession.getQueueEmbed());
  }
}

function play(guildID: string, song: Song) {
  const serverSession = sessions.get(guildID);

  if (!song) {
    serverSession.voiceChannel.leave();
    sessions.delete(guildID);
    return;
  }

  serverSession.connection
    .playStream(youtube.stream(song))
    .on('end', () => {
      play(guildID, serverSession.getNextSong());
    })
    .on('error', (error) => console.error(error));
  serverSession.setVolume();
  serverSession.textChannel.send(serverSession.getNowPlayingEmbed());
}

function isUserInVoiceChannel(msg: Message): boolean {
  const voiceChannel = msg.member.voiceChannel;
  return !!voiceChannel;
}

function isPermissionsSet(msg: Message) {
  const permissions = msg.member.voiceChannel.permissionsFor(msg.client.user);
  return permissions.has('CONNECT') && permissions.has('SPEAK');
}
