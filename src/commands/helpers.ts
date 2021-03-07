import { Message } from 'discord.js';

export function isUserInVoiceChannel(msg: Message): boolean {
  return !!msg.member && !!msg.member.voiceChannel;
}

export function isPermissionsSet(msg: Message) {
  const permissions = msg.member.voiceChannel.permissionsFor(msg.client.user);
  return permissions.has('CONNECT') && permissions.has('SPEAK');
}
