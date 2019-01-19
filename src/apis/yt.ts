import { Util } from 'discord.js';
import * as YouTube from 'simple-youtube-api';
import * as ytdl from 'ytdl-core';
import { YOUTUBE_API_KEY } from '../config';
import Song from '../models/Song';

const youtube = new YouTube(YOUTUBE_API_KEY);

export function isYoutube(url: string): boolean {
  const ytURL = /(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))([a-zA-Z0-9\-_]+)/;
  return ytURL.test(url);
}

export async function getSongByQuery(query: string): Promise<Song> {
  const videos = await youtube.search(query, 1);
  const video = await youtube.getVideoByID(videos[0].id);
  return new Song(video.id, Util.escapeMarkdown(video.title));
}

export async function getSongByURL(url: string): Promise<Song> {
  const video = await youtube.getVideo(url);
  return new Song(video.id, Util.escapeMarkdown(video.title));
}

export function stream(song: Song) {
  // WTF
  const filter: 'audioonly' = 'audioonly';
  const quality: 'lowest' = 'lowest';
  return ytdl(song.url, { filter, quality });
}
