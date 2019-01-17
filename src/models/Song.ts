export default class Song {
  public id: string;
  public title: string;
  public url: string;
  public isPlaying: boolean;
  public queuedBy: string;

  constructor(id: string, title: string) {
    this.id = id;
    this.title = title.replace(/ *\([^)]*\) */g, '');
    this.url = `https://www.youtube.com/watch?v=${id}`;
    this.isPlaying = false;
    this.queuedBy = '';
  }
}
