const fs = require("node:fs/promises");
const path = require("node:path");
const { config } = require("./config");

const DEFAULT_USER = {
  wallet: 0,
  bank: 0,
  bankLevel: 1,
  bankDefenses: {},
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

const dataDir = path.resolve(process.cwd(), config.dataDir);
const storePath = path.join(dataDir, "economy.json");
let storeQueue = Promise.resolve();

function normalizeStore(store) {
  const normalized = {
    users: {}
  };

  for (const [userId, user] of Object.entries(store?.users || {})) {
    normalized.users[userId] = { ...DEFAULT_USER, ...user };
  }

  return normalized;
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

async function connectStore() {
  await readStore();
  return storePath;
}

async function closeStore() {
  await storeQueue;
}

async function withStore(mutator) {
  const operation = storeQueue.then(async () => {
    const store = await readStore();
    const result = await mutator(store);
    await writeStore(store);
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
