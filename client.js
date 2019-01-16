const { Client } = require("discord.js");
const ytdl = require("ytdl-core");

const { TOKEN, PREFIX, INSULTS } = require("./config");

const client = new Client({
  disableEveryone: true
});

client.on("warn", console.warn);

client.on("error", console.error);

client.on("ready", () => {
  console.log("Bot is ready");
});

client.on("disconnect", () => {
  console.log("Bot disconnected, will reconnect now...");
});

client.on("reconnecting", () => {
  console.log("Reconnecting...");
});

let voiceChannelConnection;

client.on("message", async msg => {
  // ignore messages from myself and other bots
  if (msg.author.bot || !msg.content.startsWith(PREFIX)) {
    return undefined;
  }

  const insult = INSULTS[Math.floor(Math.random() * INSULTS.length)];

  // get the arguments
  const args = msg.content.split(" ");

  if (msg.content.startsWith(`${PREFIX}ping`)) {
    return msg.channel.send(`PONG du ${insult}!`);
  } else if (msg.content.startsWith(`${PREFIX}play`)) {
    const voiceChannel = msg.member.voiceChannel;
    if (!voiceChannel) {
      return msg.channel.send("Du Spast bist in keinem Voice Channel..");
    }
    const permissions = voiceChannel.permissionsFor(msg.client.user);
    if (!permissions.has("CONNECT")) {
      return msg.channel.send("Ich hab keine Rechte für den VoiceChannel..");
    }
    if (!permissions.has("SPEAK")) {
      return msg.channel.send(
        "Ich hab keine Rechte auf dem Server zu sprechen.."
      );
    }
    try {
      voiceChannelConnection = await voiceChannel.join();
    } catch (error) {
      console.log(error);
      return msg.channel.send(`Error: ${error}`);
    }
    const dispatcher = voiceChannelConnection
      .playStream(ytdl(args[1]))
      .on("end", () => {
        console.log("song ended");
        voiceChannel.leave();
      })
      .on("error", error => {
        console.log(error);
      });
    dispatcher.setVolume(0.1);
    msg.channel.send(`Alles klar ${insult}!`);
  } else if (msg.content.startsWith(`${PREFIX}stop`)) {
    if (!msg.member.voiceChannel) {
      return msg.channel.send("Bist in keinem voicechannel..");
    }
    msg.member.voiceChannel.leave();
  } else if (msg.content.startsWith(`${PREFIX}pause`)) {
    const voiceChannel = msg.member.voiceChannel;
    let connection;
    try {
      connection = await voiceChannel.join();
    } catch (error) {
      console.log(error);
      return msg.channel.send(`Error: ${error}`);
    }
    if (!connection.player.dispatcher.paused) {
      connection.player.dispatcher.pause();
      return msg.channel.send("Jo, is pausiert...");
    }
    return msg.channel.send("Is doch schon...");
  } else if (msg.content.startsWith(`${PREFIX}resume`)) {
    const voiceChannel = msg.member.voiceChannel;
    let connection;
    try {
      connection = await voiceChannel.join();
    } catch (error) {
      console.log(error);
      return msg.channel.send(`Error: ${error}`);
    }
    if (connection.player.dispatcher.paused) {
      connection.player.dispatcher.resume();
      return msg.channel.send("...und es geht weiter");
    }
    return msg.channel.send("Läuft doch");
  } else if (msg.content.startsWith(`${PREFIX}volume`)) {
    let volume = parseInt(args[1]);
    if (!voiceChannelConnection) return undefined;
    if (!voiceChannelConnection.player.dispatcher) return undefined;
    if (!volume) {
      const currentVolume =
        voiceChannelConnection.player.dispatcher.volume * 100;
      return msg.channel.send(
        `Wir ballern grad auf ${currentVolume}% Lautstärke.`
      );
    }
    if (volume > 100) {
      volume = 100;
    }
    voiceChannelConnection.player.dispatcher.setVolume(volume / 100);
    return msg.channel.send(`Neue Lautstärke: ${volume}%`);
  }
});

client.login(TOKEN);
