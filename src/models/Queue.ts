import {
  DMChannel,
  GroupDMChannel,
  TextChannel,
  VoiceChannel,
  VoiceConnection,
} from 'discord.js';
import Song from './Song';

export default class Queue {
  public textChannel: TextChannel | DMChannel | GroupDMChannel;
  public voiceChannel: VoiceChannel;
  public connection: VoiceConnection;
  public songs: Song[];
  public playing: boolean;
  private volume: number;

  constructor(
    textChannel: TextChannel | DMChannel | GroupDMChannel,
    voiceChannel: VoiceChannel,
  ) {
    this.textChannel = textChannel;
    this.voiceChannel = voiceChannel;
    this.connection = null;
    this.songs = [];
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
}
