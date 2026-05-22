const fs = require("node:fs/promises");
const path = require("node:path");
const { MongoClient } = require("mongodb");
const { config } = require("./config");

const DEFAULT_USER = {
  wallet: 0,
  bank: 0,
  bankLevel: 1,
  bankDefenses: {},
  experience: 0,
  inventory: {},
  job: null,
  jobHighAccess: false,
  pets: {},
  equippedPet: null,
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

const dataDir = path.resolve(process.cwd(), config.dataDir);
const storePath = path.join(dataDir, "economy.json");
let storeQueue = Promise.resolve();
let storeMode = "file";
let mongoClient = null;
let mongoCollection = null;

function normalizeStore(store) {
  const normalized = {
    users: {}
  };

  for (const [userId, user] of Object.entries(store?.users || {})) {
    normalized.users[userId] = { ...DEFAULT_USER, ...user };
  }

  return normalized;
}

function userToMongoDoc(userId, user) {
  return {
    _id: userId,
    ...user
  };
}

function mongoDocToUser(doc) {
  const { _id, ...user } = doc;
  return { ...DEFAULT_USER, ...user };
}

async function writeStore(store) {
  await fs.mkdir(dataDir, { recursive: true });

  const tempPath = `${storePath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await fs.copyFile(tempPath, storePath);
  await fs.rm(tempPath, { force: true });
}

async function readStore() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    const raw = await fs.readFile(storePath, "utf8");
    return normalizeStore(JSON.parse(raw));
  } catch (error) {
    if (error.code === "ENOENT") {
      const emptyStore = normalizeStore({ users: {} });
      await writeStore(emptyStore);
      return emptyStore;
    }

    if (error instanceof SyntaxError) {
      throw new Error(`Could not parse economy data file at ${storePath}.`);
    }

    throw error;
  }
}

async function readMongoStore() {
  const docs = await mongoCollection.find({}).toArray();
  const store = { users: {} };

  for (const doc of docs) {
    store.users[String(doc._id)] = mongoDocToUser(doc);
  }

  return normalizeStore(store);
}

async function writeMongoStore(store) {
  const normalized = normalizeStore(store);
  const userIds = Object.keys(normalized.users);

  if (userIds.length === 0) {
    await mongoCollection.deleteMany({});
    return;
  }

  await mongoCollection.bulkWrite([
    ...Object.entries(normalized.users).map(([userId, user]) => ({
      replaceOne: {
        filter: { _id: userId },
        replacement: userToMongoDoc(userId, user),
        upsert: true
      }
    })),
    {
      deleteMany: {
        filter: { _id: { $nin: userIds } }
      }
    }
  ]);
}

async function connectStore() {
  if (config.mongodbUri) {
    mongoClient = new MongoClient(config.mongodbUri);
    await mongoClient.connect();
    mongoCollection = mongoClient.db(config.mongodbDb).collection(config.mongodbCollection);
    await mongoClient.db(config.mongodbDb).command({ ping: 1 });
    storeMode = "mongodb";
    return `MongoDB "${config.mongodbDb}.${config.mongodbCollection}"`;
  }

  await readStore();
  return storePath;
}

async function closeStore() {
  await storeQueue;
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    mongoCollection = null;
  }
}

async function withStore(mutator) {
  const operation = storeQueue.then(async () => {
    const store = storeMode === "mongodb" ? await readMongoStore() : await readStore();
    const before = JSON.stringify(store);
    const result = await mutator(store);
    const changed = JSON.stringify(store) !== before;
    if (changed) {
      if (storeMode === "mongodb") await writeMongoStore(store);
      else await writeStore(store);
    }
    return result;
  });

  storeQueue = operation.catch(() => {});
  return operation;
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
