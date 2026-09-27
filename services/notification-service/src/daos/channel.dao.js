const { Channel } = require("../models/notification.model");

function findAll() {
  return Channel.find({});
}

async function insert(channelData) {
  const channel = new Channel(channelData);
  await channel.save();
  return channel;
}

module.exports = { findAll, insert };