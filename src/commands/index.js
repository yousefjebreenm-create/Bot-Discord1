const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const config = require('../../config.js');

const commands = [
  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('أرسل لوحة التذاكر في هذه القناة'),
  new SlashCommandBuilder()
    .setName('admin-panel')
    .setDescription('افتح لوحة تحكم الإدارة'),
].map(c => c.toJSON());

async function deployCommands(clientId) {
  const rest = new REST({ version: '10' }).setToken(config.token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('\x1b[32m[COMMANDS]\x1b[0m Slash commands deployed.');
  } catch (err) {
    console.error('[COMMANDS] Deploy failed:', err.message);
  }
}

module.exports = { deployCommands };
