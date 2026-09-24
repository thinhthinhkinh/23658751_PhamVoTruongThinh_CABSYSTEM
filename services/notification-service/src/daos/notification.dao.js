const path = require("path");
const { readData, writeData } = require("../utils/jsonFileStore");

const DATA_FILE = path.join(__dirname, "../../data/notifications.json");

function findByUserId(userId) {
  return readData(DATA_FILE)
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
}

function insert(notification) {
  const data = readData(DATA_FILE);
  data.push(notification);
  writeData(DATA_FILE, data);
  return notification;
}

module.exports = { findByUserId, insert };
