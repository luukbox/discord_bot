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
  private volume: number;

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
    this.playing = true;
    this.volume = 10;
  }

  public pause(callback: () => void) {
    if (this.playing) {
      this.playing = false;
      this.connection.dispatcher.pause();
      callback();
    }
  }

  public resume(callback: () => void) {
    if (!this.playing) {
      this.playing = true;
      this.connection.dispatcher.resume();
      callback();
    }
  }

  public shuffleQueue(callback: () => void) {
    this.queue.sort(() => Math.random() - 0.5);
    callback();
  }

  public getVolume(): number {
    return this.connection.dispatcher.volume * 100;
  }

  public setVolume(volume?: number) {
    if (!volume) {
      this.connection.dispatcher.setVolume(this.volume / 100);
      return;
    }
    if (volume > 100) {
      volume = 100;
    }
    this.volume = volume;
    this.connection.dispatcher.setVolume(volume / 100);
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
    return new RichEmbed()
      .setTitle('Warteschlange')
      .setColor(0x00ae86)
      .setDescription(description);
  }

  public getNowPlayingEmbed(): RichEmbed {
    return new RichEmbed()
      .setTitle('Jetzt läuft')
      .setColor(0x00ae86)
      .setDescription(
        `🎵 [${this.queue[0].title}](${this.queue[0].url}) ${this.queue[0].queuedBy} 🎵`,
      );
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
