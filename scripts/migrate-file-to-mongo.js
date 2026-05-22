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

function cleanUser(user) {
  return { ...DEFAULT_USER, ...(user || {}) };
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGODB;
  const mongoDb = process.env.MONGODB_DB || "economybot";
  const collectionName = process.env.MONGODB_COLLECTION || "users";
  const dataDir = path.resolve(process.cwd(), process.env.DATA_DIR || "data");
  const storePath = path.join(dataDir, "economy.json");

  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI or MONGODB in .env.");
  }

  const raw = await fs.readFile(storePath, "utf8");
  const store = JSON.parse(raw);
  const users = Object.entries(store.users || {});

  const client = new MongoClient(mongoUri);
  await client.connect();

  try {
    const collection = client.db(mongoDb).collection(collectionName);

    if (users.length === 0) {
      console.log("No local users found to migrate.");
      return;
    }

    await collection.bulkWrite(users.map(([userId, user]) => ({
      replaceOne: {
        filter: { _id: userId },
        replacement: { _id: userId, ...cleanUser(user) },
        upsert: true
      }
    })));

    console.log(`Migrated ${users.length} local user(s) into MongoDB collection "${mongoDb}.${collectionName}".`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
