const {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} = require("unique-names-generator");

exports.subscribers = [];

exports.logs = [];

exports.cacheEvents = [];

exports.rooms = [];

exports.users = [];

exports.serverName = uniqueNamesGenerator({
  dictionaries: [adjectives, colors, animals],
});
