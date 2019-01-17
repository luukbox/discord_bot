export default class Song {
  public id: string;
  public title: string;
  public url: string;

  constructor(id: string, title: string) {
    this.id = id;
    this.title = title;
    this.url = `https://www.youtube.com/watch?v=${id}`;
  }
}
