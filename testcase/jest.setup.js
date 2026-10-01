// Jest compat: MongoDB driver v7 uses dynamic import('os') in resolveRuntimeAdapters.
// Jest's VM intercepts import() and throws "A dynamic import callback was invoked without
// --experimental-vm-modules", causing client.connect() to hang until serverSelectionTimeoutMS.
// Fix: inject runtimeAdapters.os so the driver skips the dynamic import path entirely.
const os = require('os');
const mongodb = require('mongodb');
const OrigMongoClient = mongodb.MongoClient;

class PatchedMongoClient extends OrigMongoClient {
  constructor(url, options) {
    super(url, { runtimeAdapters: { os }, ...options });
  }
}
Object.defineProperty(PatchedMongoClient, 'name', { value: 'MongoClient' });

mongodb.MongoClient = PatchedMongoClient;
