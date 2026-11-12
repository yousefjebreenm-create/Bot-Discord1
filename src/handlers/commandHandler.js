const fs = require('fs');
const path = require('path');

function loadCommands(client) {
  const commandsPath = path.join(__dirname, '../commands');
  if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath, { recursive: true });
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const cmd = require(path.join(commandsPath, file));
    client.commands.set(cmd.name, cmd);
    console.log(`\x1b[33m[COMMANDS]\x1b[0m Loaded: ${cmd.name}`);
  }
}

module.exports = { loadCommands };
