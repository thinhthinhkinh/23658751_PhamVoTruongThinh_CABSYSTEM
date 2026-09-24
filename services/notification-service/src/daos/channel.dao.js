const path = require("path");
const { readData, writeData } = require("../utils/jsonFileStore");

const DATA_FILE = path.join(__dirname, "../../data/channels.json");

function findAll() {
  return readData(DATA_FILE);
}

function insert(channel) {
  const data = readData(DATA_FILE);
  data.push(channel);
  writeData(DATA_FILE, data);
  return channel;
}

module.exports = { findAll, insert };
