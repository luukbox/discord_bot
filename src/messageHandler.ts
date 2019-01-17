import { Message, Util } from 'discord.js';
import * as YouTube from 'simple-youtube-api';
import * as ytdl from 'ytdl-core';

import { INSULTS, PREFIX, YOUTUBE_API_KEY } from './config';
import Queue from './models/Queue';
import Song from './models/Song';

const queue: Map<string, Queue> = new Map();

const youtube = new YouTube(YOUTUBE_API_KEY);

export default async function(msg: Message) {
  if (msg.author.bot || !msg.content.startsWith(PREFIX)) {
    return;
  }

  const serverQueue = queue.get(msg.guild.id);

  const insult = INSULTS[Math.floor(Math.random() * INSULTS.length)];

  // get the arguments
  const args = msg.content.split(' ');

  // PING
  if (msg.content.startsWith(`${PREFIX}ping`)) {
    return msg.channel.send(`PONG du ${insult}!`);
  }
  // PLAY
  else if (msg.content.startsWith(`${PREFIX}play`)) {
    if (!isUserInVoiceChannel(msg)) {
      return msg.channel.send('Du Spast bist in keinem Voice Channel..');
    }

    if (!isPermissionsSet(msg)) {
      return msg.channel.send('Ich hab keine Rechte für den VoiceChannel..');
    }

    if (!args[1]) {
      return;
    }
    const url = args[1].replace(/<(.+)>/g, '$1');
    let video;
    try {
      video = await youtube.getVideo(url);
    } catch (error) {
      try {
        const query = args.slice(1).join(' ');
        const videos = await youtube.search(query, 1);
        video = await youtube.getVideoByID(videos[0].id);
      } catch (err) {
        console.error(err);
        return msg.channel.send('Konnte dazu leider nichts finden...');
      }
    }

    const song = new Song(video.id, Util.escapeMarkdown(video.title));
    console.log(song);

    if (!serverQueue) {
      const newServerQueue = new Queue(msg.channel, msg.member.voiceChannel);
      newServerQueue.songs.push(song);
      try {
        const connection = await msg.member.voiceChannel.join();
        newServerQueue.connection = connection;
        queue.set(msg.guild.id, newServerQueue);
        play(msg.guild.id, newServerQueue.songs[0]);
      } catch (error) {
        console.log(error);
        queue.delete(msg.guild.id);
        return msg.channel.send(`Error: ${error}`);
      }
    } else {
      serverQueue.songs.push(song);
      return msg.channel.send(
        `${song.title} wurde der Warteschlange hinzugefügt`,
      );
    }
  }
  // STOP
  else if (msg.content.startsWith(`${PREFIX}stop`)) {
    if (!msg.member.voiceChannel) {
      return msg.channel.send('Bist in keinem voicechannel..');
    }
    if (!serverQueue) {
      return;
    }
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
  }
  // PAUSE
  else if (msg.content.startsWith(`${PREFIX}pause`)) {
    if (!isUserInVoiceChannel(msg)) {
      return msg.channel.send('Du Spast bist in keinem Voice Channel..');
    }
    if (!serverQueue) {
      return;
    }
    serverQueue.pause(() => msg.channel.send('Jo, is pausiert...'));
    return;
  }
  // RESUME
  else if (msg.content.startsWith(`${PREFIX}resume`)) {
    if (!isUserInVoiceChannel(msg)) {
      return msg.channel.send('Du Spast bist in keinem Voice Channel..');
    }
    if (!serverQueue) {
      return;
    }
    serverQueue.resume(() => msg.channel.send('...und es geht weiter'));
  }
  // VOLUME
  else if (msg.content.startsWith(`${PREFIX}volume`)) {
    if (!serverQueue) {
      return;
    }
    const volume = parseInt(args[1], 10);
    if (!volume) {
      return msg.channel.send(
        `Wir ballern grad auf ${serverQueue.getVolume()}% Lautstärke.`,
      );
    }
    if (!isUserInVoiceChannel(msg)) {
      return msg.channel.send('Du Spast bist in keinem Voice Channel..');
    }
    serverQueue.setVolume(volume);
    return msg.channel.send(`Neue Lautstärke: ${serverQueue.getVolume()}%`);
  } else if (msg.content.startsWith(`${PREFIX}skip`)) {
    if (!isUserInVoiceChannel(msg)) {
      return msg.channel.send('Du Spast bist in keinem Voice Channel..');
    }
    if (!serverQueue) {
      return;
    }
    serverQueue.connection.dispatcher.end();
  } else if (msg.content.startsWith(`${PREFIX}queue`)) {
    if (!serverQueue) {
      return;
    }
    return msg.channel.send(`
      ${serverQueue.songs
        .map((song, index) => {
          if (index === 0) {
            return `--> ${index + 1}. ${song.title}`;
          }
          return `${index + 1}. ${song.title}`;
        })
        .join('\n')}
    `);
  }
}

function play(guildID: string, song: Song) {
  const serverQueue = queue.get(guildID);

  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guildID);
    return;
  }

  serverQueue.connection
    .playStream(ytdl(song.url))
    .on('end', () => {
      serverQueue.songs.shift();
      play(guildID, serverQueue.songs[0]);
    })
    .on('error', (error) => console.error(error));
  serverQueue.setVolume();
  serverQueue.textChannel.send(`Jetzt läuft: ${song.title}`);
}

function isUserInVoiceChannel(msg: Message): boolean {
  const voiceChannel = msg.member.voiceChannel;
  return !!voiceChannel;
}

function isPermissionsSet(msg: Message) {
  const permissions = msg.member.voiceChannel.permissionsFor(msg.client.user);
  return permissions.has('CONNECT') && permissions.has('SPEAK');
}
