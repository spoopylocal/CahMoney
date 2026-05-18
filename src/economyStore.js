const { MongoClient } = require("mongodb");
const { config } = require("./config");

const DEFAULT_USER = {
  wallet: 0,
  bank: 0,
  experience: 0,
  inventory: {},
  boosts: {},
  rig: null,
  lastBeg: 0,
  lastWork: 0,
  lastDaily: 0,
  lastRob: 0,
  lastBankrob: 0,
  lastHunt: 0,
  lastGive: 0,
  lastMine: 0
};

let client;
let collection;

async function connectStore() {
  if (collection) return collection;

  client = new MongoClient(config.mongoUri);
  await client.connect();

  const db = client.db(config.mongoDb);
  collection = db.collection("users");
  await collection.createIndex({ wallet: -1, bank: -1 });

  return collection;
}

async function closeStore() {
  if (client) {
    await client.close();
    client = null;
    collection = null;
  }
}

async function withStore(mutator) {
  const users = await connectStore();
  const docs = await users.find({}).toArray();
  const store = { users: {} };

  for (const doc of docs) {
    const { _id, ...user } = doc;
    store.users[_id] = { ...DEFAULT_USER, ...user };
  }

  const result = mutator(store);
  const writes = Object.entries(store.users).map(([userId, user]) => ({
    updateOne: {
      filter: { _id: userId },
      update: { $set: user },
      upsert: true
    }
  }));

  if (writes.length > 0) {
    await users.bulkWrite(writes);
  }

  return result;
}

function getUser(store, userId) {
  if (!store.users[userId]) {
    store.users[userId] = { ...DEFAULT_USER };
  }

  return store.users[userId];
}

function getNetWorth(user) {
  return user.wallet + user.bank;
}

module.exports = {
  connectStore,
  closeStore,
  withStore,
  getUser,
  getNetWorth
};
