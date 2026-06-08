// Aggregates every command category into the single `commands` array
// that index.js and deploy-commands.js expect.
const economy = require("./economy");
const bank = require("./bank");
const crime = require("./crime");
const gambling = require("./gambling");
const items = require("./items");
const progression = require("./progression");
const dev = require("./dev");

const commands = [
  ...economy,
  ...bank,
  ...crime,
  ...gambling,
  ...items,
  ...progression,
  ...dev
];

module.exports = { commands };
