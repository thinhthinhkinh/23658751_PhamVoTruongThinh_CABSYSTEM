// Wraps mongodb driver to provide runtimeAdapters.os, bypassing the dynamic import('os')
// that fails in Jest's VM context ("A dynamic import callback was invoked without --experimental-vm-modules").
const os = require('os');
const path = require('path');

// Load the actual mongodb by absolute path to avoid moduleNameMapper circular redirect
const actualMongodbPath = path.resolve(__dirname, 'node_modules', 'mongodb');
const mongodb = require(actualMongodbPath);
const OrigMongoClient = mongodb.MongoClient;

class MongoClient extends OrigMongoClient {
  constructor(url, options) {
    super(url, { runtimeAdapters: { os }, ...options });
  }
}
Object.defineProperty(MongoClient, 'name', { value: 'MongoClient' });

module.exports = { ...mongodb, MongoClient };
