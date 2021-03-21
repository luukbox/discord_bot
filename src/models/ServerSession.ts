import {
  DMChannel,
  GroupDMChannel,
  RichEmbed,
  TextChannel,
  VoiceChannel,
  VoiceConnection,
} from 'discord.js';
import Song from './Song';

export default class ServerSession {
  public guildID: string;
  public textChannel: TextChannel | DMChannel | GroupDMChannel;
  public voiceChannel: VoiceChannel;
  public connection: VoiceConnection;
  public queue: Song[];
  public playing: boolean;

  constructor(
    textChannel: TextChannel | DMChannel | GroupDMChannel,
    voiceChannel: VoiceChannel,
    guildID: string,
  ) {
    this.textChannel = textChannel;
    this.voiceChannel = voiceChannel;
    this.guildID = guildID;
    this.connection = null;
    this.queue = [];
    this.playing = false;
  }

  public pause(callback: () => void) {
    if (this.playing) {
      this.playing = false;
      this.connection.dispatcher.pause();
      callback();
    }
  }

  public resume(callback: () => void) {
    if (!this.playing && this.queue.length > 0) {
      this.playing = true;
      this.connection.dispatcher.resume();
      callback();
    }
  }

  public queueChannelLeave(callbackOnLeave: () => void) {
    setTimeout(() => {
      if (this.playing) {
        return;
      }
      this.voiceChannel.leave();
      callbackOnLeave();
    }, 5 * 60 * 1000); // 5 mins
  }

  public shuffleQueue(callback: () => void) {
    this.queue.sort(() => Math.random() - 0.5);
    callback();
  }

  public getQueueEmbed(): RichEmbed {
    const maxElementsDisplayedInQueue = 20;
    let description = this.queue
      .slice(0, maxElementsDisplayedInQueue)
      .map((song, index) => {
        if (index === 0) {
          return `🎵 [${song.title}](${song.url}) ${song.queuedBy} 🎵\n`;
        }
        return `${index}. [${song.title}](${song.url}) ${song.queuedBy}`;
      })
      .join('\n');
    if (this.queue.length > maxElementsDisplayedInQueue) {
      description += `\n...${this.queue.length - maxElementsDisplayedInQueue}`;
    }
    if (this.queue.length === 0) {
      return new RichEmbed({
        title: 'Warteschlange',
        color: 0x00ae86,
        image: {
          url:
            'https://media1.tenor.com/images/36f2ec3fb32381e09b6bf96e818faf13/tenor.gif',
        },
      });
    }
    return new RichEmbed()
      .setTitle('Warteschlange')
      .setColor(0x00ae86)
      .setDescription(description);
  }

  public getNowPlayingEmbed(): RichEmbed {
    let description = `🎵 [${this.queue[0].title}](${this.queue[0].url}) ${this.queue[0].queuedBy} 🎵`;
    if (this.queue.length > 1) {
      description += `\n\nNext Up:\n\n[${this.queue[1].title}](${this.queue[1].url}) ${this.queue[1].queuedBy}`;
    }
    return new RichEmbed()
      .setTitle('Jetzt läuft')
      .setColor(0x00ae86)
      .setDescription(description);
  }

  public getNextSong(): Song {
    this.queue.shift();
    const nextSong = this.queue[0];
    if (!nextSong) {
      return null;
    } else {
      nextSong.isPlaying = true;
      return nextSong;
    }
  }
}
