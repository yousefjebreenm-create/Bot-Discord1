const fs   = require('fs');
const path = require('path');

function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');
  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const event  = require(path.join(eventsPath, file));
    const method = event.once ? 'once' : 'on';

    client[method](event.name, async (...args) => {
      try {
        await event.execute(...args, client);
      } catch (err) {
        console.error(`[EVENT ERROR: ${event.name}]`, err?.message || err);
      }
    });

    console.log(`\x1b[36m[EVENTS]\x1b[0m Loaded: ${event.name}`);
  }
}

module.exports = { loadEvents };
