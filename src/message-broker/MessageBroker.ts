import { Client, Message } from 'discord.js';

export interface ICommand {
  commandString: string;
  run(message: Message): void;
}

export class MessageBroker {
  private commands: Map<string, ICommand>;
  private client: Client;
  private prefix: string;

  constructor(client: Client, prefix: string) {
    this.commands = new Map<string, ICommand>();
    this.client = client;
    this.prefix = prefix;
    this.init();
  }

  public addCommand(command: ICommand): void {
    this.commands.set(command.commandString, command);
  }

  public handle(message: Message) {
    console.log(message.content);
    const commandString = message.content
      .split(' ')[0]
      .replace(this.prefix, '');
    const command = this.commands.get(commandString);
    if (command) {
      command.run(message);
    }
  }

  private init() {
    this.client.on('ready', () => {
      console.log('LuukBox is ready..');
    });

    this.client.on('disconnect', () => {
      console.log('LuukBox disconnected, will reconnect now...');
    });

    this.client.on('reconnecting', () => {
      console.log('Reconnecting...');
    });

    this.client.on('warn', console.warn);

    this.client.on('error', console.error);

    this.client.on('message', (msg) => {
      if (!msg.author.bot && msg.content.startsWith(this.prefix)) {
        this.handle(msg);
      }
    });
  }
}
