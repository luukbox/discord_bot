import SpotifyWebApi from 'spotify-web-api-node';
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '../config';
import Song from '../models/Song';

let spotifyApi: SpotifyWebApi;

let expirationDateMS: number;

export async function initSpotify() {
  spotifyApi = new SpotifyWebApi({
    clientId: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET,
  });
  const accessTokenResponse = await spotifyApi.clientCredentialsGrant();

  const accessToken = accessTokenResponse.body['access_token'];
  expirationDateMS = Date.now() + accessTokenResponse.body['expires_in'] * 1000;

  console.log(
    'accessTokenResponse',
    JSON.stringify(accessTokenResponse, null, 2),
  );
  console.log('The access token expires at ' + expirationDateMS);
  console.log('The access token is ' + accessToken);

  // Save the access token so that it's used in future calls
  spotifyApi.setAccessToken(accessToken);
}

export async function fetchSpotifyTrack(trackId: string): Promise<Song> {
  const trackResponse = await spotifyApi.getTrack(trackId);
  const trackName = trackResponse.body.name;
  const artistName = trackResponse.body.artists[0].name;
  return new Song(null, artistName + ' - ' + trackName);
}

const PLAYLIST_LIMIT = 100;

export async function fetchSpotifyPlaylistTracks(
  playlistId: string,
): Promise<Song[]> {
  const tracks = [];
  let done = false;
  let offset = 0;
  do {
    const playlistResponse = await spotifyApi.getPlaylistTracks(playlistId, {
      limit: PLAYLIST_LIMIT,
      offset,
    });
    tracks.push(...playlistResponse.body.items);
    done = !playlistResponse.body.next;
    offset += PLAYLIST_LIMIT;
  } while (!done);

  return tracks
    .map((item) => item.track)
    .map((track) => new Song(null, track.artists[0].name + ' - ' + track.name));
}
// https://open.spotify.com/track/1uyOpyskQrpOUR5FW0kt3E?si=8rtrmqDXRfG8F1ENbi3Srw
// spotify:track:1uyOpyskQrpOUR5FW0kt3E

export function isSpotifyTrackUri(uri: string) {
  return (
    uri.startsWith('spotify:track:') ||
    uri.startsWith('https://open.spotify.com/track/')
  );
}

export function isSpotifyPlaylistUri(uri: string) {
  return (
    uri.startsWith('spotify:playlist:') ||
    uri.startsWith('https://open.spotify.com/playlist/')
  );
}

export function parseSpotifyIdFromUri(uri: string) {
  if (uri.startsWith('spotify:track:')) {
    return uri.split(':')[2];
  }
  if (uri.startsWith('spotify:playlist:')) {
    return uri.split(':')[2];
  }
  if (uri.startsWith('https://open.spotify.com/track/')) {
    return uri.replace('https://open.spotify.com/track/', '').split('?')[0];
  }
  if (uri.startsWith('https://open.spotify.com/playlist/')) {
    return uri.replace('https://open.spotify.com/playlist/', '').split('?')[0];
  }
}
