const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");

const TARGET_VOICE_CHANNEL = "1487006937903271956";
const REJOIN_DELAY_MS = 3000; // ننتظر 3 ثواني قبل الرجوع

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    // نتحقق إذا التغيير يخص البوت نفسه
    if (newState.member?.user?.id !== client.user.id) return;

    const wasInTarget = oldState.channelId === TARGET_VOICE_CHANNEL;
    const stillInTarget = newState.channelId === TARGET_VOICE_CHANNEL;

    // إذا البوت طلع من الروم المستهدف (ديسكونكت أو نقل)
    if (wasInTarget && !stillInTarget) {
      console.log(`\x1b[33m[VOICE]\x1b[0m Bot disconnected from voice channel, rejoining in ${REJOIN_DELAY_MS / 1000}s...`);

      setTimeout(async () => {
        try {
          const guild = oldState.guild;
          const voiceChannel = guild.channels.cache.get(TARGET_VOICE_CHANNEL);

          if (!voiceChannel) {
            console.error("[VOICE] Target channel not found.");
            return;
          }

          // تنظيف الكونكشن القديم إذا موجود
          const existingConnection = getVoiceConnection(guild.id);
          if (existingConnection) existingConnection.destroy();

          joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: true,
          });

          console.log(`\x1b[32m[VOICE]\x1b[0m Successfully rejoined: ${voiceChannel.name}`);
        } catch (e) {
          console.error("[VOICE_REJOIN_ERR]", e);
        }
      }, REJOIN_DELAY_MS);
    }
  },
};
