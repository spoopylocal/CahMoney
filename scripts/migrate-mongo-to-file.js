require("dotenv").config();

const fs = require("node:fs/promises");
const path = require("node:path");
const { MongoClient } = require("mongodb");

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

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function cleanUserDoc(doc) {
  const { _id, ...user } = doc;
  return {
    userId: String(_id),
    user: { ...DEFAULT_USER, ...user }
  };
}

async function backupExistingFile(storePath) {
  try {
    await fs.access(storePath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }

  const backupPath = `${storePath}.backup-${timestamp()}`;
  await fs.copyFile(storePath, backupPath);
  return backupPath;
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  const mongoDb = process.env.MONGODB_DB || "economybot";
  const collectionName = process.env.MONGODB_COLLECTION || "users";
  const dataDir = path.resolve(process.cwd(), process.env.DATA_DIR || "data");
  const storePath = path.join(dataDir, "economy.json");

  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI in .env. Add it back temporarily for migration.");
  }

  await fs.mkdir(dataDir, { recursive: true });

  const client = new MongoClient(mongoUri);
  await client.connect();

  try {
    const docs = await client.db(mongoDb).collection(collectionName).find({}).toArray();
    const store = { users: {} };

    for (const doc of docs) {
      const { userId, user } = cleanUserDoc(doc);
      store.users[userId] = user;
    }

    const backupPath = await backupExistingFile(storePath);
    await fs.writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");

    console.log(`Migrated ${docs.length} user(s) from MongoDB collection "${mongoDb}.${collectionName}".`);
    console.log(`Wrote local economy data to ${storePath}.`);
    if (backupPath) console.log(`Backed up previous data file to ${backupPath}.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
