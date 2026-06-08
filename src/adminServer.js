const http = require("node:http");
const crypto = require("node:crypto");
const { URL } = require("node:url");
const { config } = require("./config");
const { getUser, withStore } = require("./economyStore");

const DEFAULT_USER = {
  wallet: 0,
  bank: 0,
  bankLevel: 1,
  bankDefenses: {},
  experience: 0,
  inventory: {},
  job: null,
  jobHighAccess: false,
  jobApplyCooldowns: {},
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

const itemCatalog = [
  ["xp_potion", "XP Potion"],
  ["cash_potion", "Cash Potion"],
  ["dirt", "Dirt"],
  ["lucky_charm", "Lucky Charm"],
  ["broken_phone", "Broken Phone"],
  ["rubber_duck", "Rubber Duck"],
  ["gold_ring", "Gold Ring"],
  ["mystery_block", "Mystery Block"],
  ["fake_id", "Fake ID"],
  ["shiny_rock", "Shiny Rock"],
  ["wooden_pickaxe", "Wooden Pickaxe"],
  ["stone_pickaxe", "Stone Pickaxe"],
  ["iron_pickaxe", "Iron Pickaxe"],
  ["gold_pickaxe", "Gold Pickaxe"],
  ["diamond_pickaxe", "Diamond Pickaxe"],
  ["netherite_pickaxe", "Netherite Pickaxe"],
  ["cobblestone", "Cobblestone"],
  ["coal", "Coal"],
  ["iron", "Iron"],
  ["raw_gold", "Raw Gold"],
  ["redstone", "Redstone"],
  ["diamond", "Diamond"],
  ["emerald", "Emerald"],
  ["end_stone", "End Stone"],
  ["netherite_ingot", "Netherite Ingot"],
  ["ruby", "Ruby"],
  ["pebble", "Pebble"],
  ["fries", "Fries"],
  ["crown", "Crown"],
  ["cd", "CD"],
  ["burger", "Burger"],
  ["boots", "Boots"],
  ["watermelon", "Watermelon"],
  ["toco", "Toco"],
  ["orange", "Orange"],
  ["meat", "Meat"],
  ["beans", "Beans"],
  ["croissant", "Croissant"],
  ["crunch", "Crunch"],
  ["basicdog", "Basic Dog"],
  ["cat", "Cat"],
  ["funnydog", "Funny Dog"],
  ["geckodragon", "Gecko Dragon"],
  ["lizard", "Lizard"],
  ["rufus", "Rufus"],
  ["smirkcat", "Smirk Cat"],
  ["alarm", "Alarm"],
  ["laser_grid", "Laser Grid"],
  ["land_mine", "Land Mine"],
  ["guard", "Guard"],
  ["hackdevice", "Hack Device"],
  ["void", "Void"],
  ["businesscard", "Business Card"]
];

const itemCategoryMap = {
  xp_potion: "Boosts",
  cash_potion: "Boosts",
  lucky_charm: "Boosts",
  dirt: "Common",
  broken_phone: "Common",
  rubber_duck: "Common",
  gold_ring: "Common",
  mystery_block: "Common",
  fake_id: "Crime",
  shiny_rock: "Common",
  wooden_pickaxe: "Mine",
  stone_pickaxe: "Mine",
  iron_pickaxe: "Mine",
  gold_pickaxe: "Mine",
  diamond_pickaxe: "Mine",
  netherite_pickaxe: "Mine",
  cobblestone: "Mine",
  coal: "Mine",
  iron: "Mine",
  raw_gold: "Mine",
  redstone: "Mine",
  diamond: "Mine",
  emerald: "Mine",
  end_stone: "Mine",
  netherite_ingot: "Mine",
  ruby: "Mine",
  pebble: "Common",
  fries: "Food",
  burger: "Food",
  watermelon: "Food",
  toco: "Food",
  orange: "Food",
  meat: "Food",
  beans: "Food",
  croissant: "Food",
  crunch: "Food",
  crown: "Rare",
  cd: "Common",
  boots: "Common",
  basicdog: "Pets",
  cat: "Pets",
  funnydog: "Pets",
  geckodragon: "Pets",
  lizard: "Pets",
  rufus: "Pets",
  smirkcat: "Pets",
  alarm: "Bank",
  laser_grid: "Bank",
  land_mine: "Bank",
  guard: "Bank",
  hackdevice: "Crime",
  void: "Crime",
  businesscard: "Crime"
};

const bankDefenseCatalog = [
  ["alarm", "Alarm"],
  ["laser_grid", "Laser Grid"],
  ["land_mine", "Land Mine"],
  ["guard", "Guard"]
];

const boostCatalog = [
  ["lucky_charm", "Lucky Charm"]
];

const petCatalog = [
  ["basicdog", "Basic Dog"],
  ["cat", "Cat"],
  ["funnydog", "Funny Dog"],
  ["geckodragon", "Gecko Dragon"],
  ["lizard", "Lizard"],
  ["rufus", "Rufus"],
  ["smirkcat", "Smirk Cat"]
];

const JOB_PROMOTION_XP = 300;
const JOB_MAX_LEVEL = 5;
const JOB_FAIL_LIMIT = 3;

const jobCatalog = [
  ["dog_walker", "Dog Walker", "basic"],
  ["burger_cashier", "Burger Cashier", "basic"],
  ["mall_cop", "Mall Cop", "basic"],
  ["mechanic", "Mechanic", "medium"],
  ["security_tech", "Security Tech", "medium"],
  ["accountant", "Accountant", "medium"],
  ["ceo", "CEO", "high"],
  ["bank_consultant", "Bank Consultant", "high"],
  ["venture_capitalist", "Venture Capitalist", "high"]
];

const rigGames = [
  ["next", "Next Game"],
  ["gamble", "Gamble"],
  ["coinflip", "Coinflip"],
  ["blackjack", "Blackjack"],
  ["highlow", "Highlow"]
];

const rigOutcomes = [
  ["win", "Win"],
  ["lose", "Lose"],
  ["blackjack", "Blackjack"]
];

const discordUserCache = new Map();

async function resolveDiscordUserName(userId) {
  if (!config.token || typeof fetch !== "function" || !/^\d{10,25}$/.test(userId)) return null;

  const cached = discordUserCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.name;

  try {
    const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: { authorization: `Bot ${config.token}` }
    });
    if (!res.ok) return null;

    const user = await res.json();
    const name = user.global_name || user.username || null;
    discordUserCache.set(userId, { name, expiresAt: Date.now() + 60 * 60 * 1000 });
    return name;
  } catch {
    return null;
  }
}

function send(res, status, body, type = "application/json") {
  res.writeHead(status, {
    "content-type": `${type}; charset=utf-8`,
    "cache-control": "no-store"
  });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

function isAuthorized(req) {
  if (!config.adminToken) return false;
  const provided = Buffer.from(req.headers.authorization || "");
  const expected = Buffer.from(`Bearer ${config.adminToken}`);
  // Length guard first (timingSafeEqual throws on mismatch), then constant-time compare.
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("Request body too large.");
    chunks.push(chunk);
  }

  return chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function cleanUser(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const user = { ...DEFAULT_USER, ...source };

  for (const key of ["wallet", "bank", "bankLevel", "experience", "lastBeg", "lastWork", "lastDaily", "lastRob", "lastBankrob", "lastHunt", "lastGive", "lastMine"]) {
    user[key] = Math.max(0, Math.floor(Number(user[key]) || 0));
  }
  user.bankLevel = Math.min(10, Math.max(1, user.bankLevel || 1));

  user.bankDefenses = source.bankDefenses && typeof source.bankDefenses === "object" && !Array.isArray(source.bankDefenses) ? source.bankDefenses : {};
  user.inventory = source.inventory && typeof source.inventory === "object" && !Array.isArray(source.inventory) ? source.inventory : {};
  user.job = source.job && typeof source.job === "object" && !Array.isArray(source.job) ? source.job : null;
  if (user.job) {
    const jobId = String(user.job.id || "");
    if (!jobCatalog.some(([id]) => id === jobId)) {
      user.job = null;
    } else {
      const xp = Math.max(0, Math.floor(Number(user.job.xp) || 0));
      const level = Math.min(JOB_MAX_LEVEL, Math.max(1, Math.floor(Number(user.job.level) || Math.floor(xp / JOB_PROMOTION_XP) + 1)));
      user.job = {
        id: jobId,
        xp,
        level,
        failStreak: Math.min(JOB_FAIL_LIMIT, Math.max(0, Math.floor(Number(user.job.failStreak) || 0))),
        hiredAt: Math.max(0, Math.floor(Number(user.job.hiredAt) || Date.now()))
      };
    }
  }
  user.jobHighAccess = Boolean(source.jobHighAccess);
  user.jobApplyCooldowns = source.jobApplyCooldowns && typeof source.jobApplyCooldowns === "object" && !Array.isArray(source.jobApplyCooldowns) ? source.jobApplyCooldowns : {};
  for (const tier of ["basic", "medium", "high"]) {
    const timestamp = Math.max(0, Math.floor(Number(user.jobApplyCooldowns[tier]) || 0));
    if (timestamp > 0) user.jobApplyCooldowns[tier] = timestamp;
    else delete user.jobApplyCooldowns[tier];
  }
  user.pets = source.pets && typeof source.pets === "object" && !Array.isArray(source.pets) ? source.pets : {};
  user.equippedPet = source.equippedPet || null;
  user.boosts = source.boosts && typeof source.boosts === "object" && !Array.isArray(source.boosts) ? source.boosts : {};
  user.rig = source.rig || null;
  if (user.rig && typeof user.rig === "object") {
    const highlowRoll = Math.floor(Number(user.rig.highlowRoll));
    if (Number.isInteger(highlowRoll) && highlowRoll >= 0 && highlowRoll <= 100) {
      user.rig.highlowRoll = highlowRoll;
    } else {
      delete user.rig.highlowRoll;
    }
  }

  for (const [itemId, quantity] of Object.entries(user.bankDefenses)) {
    const amount = Math.floor(Number(quantity) || 0);
    if (amount > 0) user.bankDefenses[itemId] = amount;
    else delete user.bankDefenses[itemId];
  }

  for (const [itemId, quantity] of Object.entries(user.inventory)) {
    const amount = Math.floor(Number(quantity) || 0);
    if (amount > 0) user.inventory[itemId] = amount;
    else delete user.inventory[itemId];
  }

  for (const [boostId, expiresAt] of Object.entries(user.boosts)) {
    const time = Math.floor(Number(expiresAt) || 0);
    if (time > 0) user.boosts[boostId] = time;
    else delete user.boosts[boostId];
  }

  for (const [petId, petData] of Object.entries(user.pets)) {
    if (!petCatalog.some(([id]) => id === petId) || !petData || typeof petData !== "object" || Array.isArray(petData)) {
      delete user.pets[petId];
      continue;
    }

    const xp = Math.max(0, Math.floor(Number(petData.xp) || 0));
    const fedUntil = Math.max(0, Math.floor(Number(petData.fedUntil) || 0));
    const lastIdleAt = Math.max(0, Math.floor(Number(petData.lastIdleAt) || Date.now()));
    const stash = petData.stash && typeof petData.stash === "object" && !Array.isArray(petData.stash) ? petData.stash : {};
    const boosts = petData.boosts && typeof petData.boosts === "object" && !Array.isArray(petData.boosts) ? petData.boosts : {};

    for (const [itemId, quantity] of Object.entries(stash)) {
      const amount = Math.floor(Number(quantity) || 0);
      if (amount > 0) stash[itemId] = amount;
      else delete stash[itemId];
    }

    for (const [boostId, boost] of Object.entries(boosts)) {
      if (!boost || typeof boost !== "object" || Array.isArray(boost)) {
        delete boosts[boostId];
        continue;
      }

      const multiplier = Number(boost.multiplier) || 1;
      const expiresAt = Math.floor(Number(boost.expiresAt) || 0);
      if (expiresAt > 0) boosts[boostId] = { multiplier, expiresAt };
      else delete boosts[boostId];
    }

    user.pets[petId] = {
      id: petId,
      xp,
      level: Math.floor(xp / 100) + 1,
      fedUntil,
      lastIdleAt,
      stash,
      boosts
    };
  }

  if (user.equippedPet && !user.pets[user.equippedPet]) user.equippedPet = null;

  return user;
}

async function handleApi(req, res, pathname) {
  if (!isAuthorized(req)) {
    send(res, 401, { error: "Unauthorized" });
    return;
  }

  if (req.method === "GET" && pathname === "/api/meta") {
    send(res, 200, {
      items: itemCatalog.map(([id, name]) => ({ id, name, category: itemCategoryMap[id] || "Other" })),
      bankDefenses: bankDefenseCatalog.map(([id, name]) => ({ id, name, category: "Bank" })),
      pets: petCatalog.map(([id, name]) => ({ id, name })),
      jobs: jobCatalog.map(([id, name, tier]) => ({ id, name, tier })),
      jobRules: { promotionXp: JOB_PROMOTION_XP, maxLevel: JOB_MAX_LEVEL, failLimit: JOB_FAIL_LIMIT },
      boosts: boostCatalog.map(([id, name]) => ({ id, name })),
      rigGames: rigGames.map(([id, name]) => ({ id, name })),
      rigOutcomes: rigOutcomes.map(([id, name]) => ({ id, name }))
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/items") {
    send(res, 200, { items: itemCatalog.map(([id]) => id) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/users") {
    const summaries = await withStore((store) =>
      Object.entries(store.users)
        .map(([userId, user]) => ({
          userId,
          wallet: user.wallet || 0,
          bank: user.bank || 0,
          experience: user.experience || 0,
          items: Object.values(user.inventory || {}).reduce((sum, quantity) => sum + quantity, 0),
          boosts: Object.keys(user.boosts || {}).length
        }))
    );
    const users = await Promise.all(summaries.map(async (user) => ({
      ...user,
      displayName: await resolveDiscordUserName(user.userId)
    })));
    users.sort((a, b) => b.wallet + b.bank - (a.wallet + a.bank));
    send(res, 200, { users });
    return;
  }

  const userMatch = pathname.match(/^\/api\/users\/(\d{10,25})$/);

  if (userMatch && req.method === "GET") {
    const userId = userMatch[1];
    const user = await withStore((store) => getUser(store, userId));
    send(res, 200, { userId, displayName: await resolveDiscordUserName(userId), user });
    return;
  }

  if (userMatch && req.method === "PUT") {
    const userId = userMatch[1];
    const body = await readBody(req);
    await withStore((store) => {
      const user = cleanUser({ ...getUser(store, userId), ...body.user });
      store.users[userId] = user;
    });
    const user = await withStore((store) => getUser(store, userId));
    send(res, 200, { ok: true, userId, user });
    return;
  }

  if (userMatch && req.method === "DELETE") {
    await withStore((store) => {
      delete store.users[userMatch[1]];
    });
    send(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && pathname === "/api/users") {
    const body = await readBody(req);
    const userId = String(body.userId || "").trim();

    if (!/^\d{10,25}$/.test(userId)) {
      send(res, 400, { error: "User ID must be a Discord snowflake." });
      return;
    }

    const user = cleanUser(body.user);
    await withStore((store) => {
      store.users[userId] = user;
    });
    send(res, 201, { ok: true, userId, user });
    return;
  }

  send(res, 404, { error: "Not found" });
}

function pageHtml() {
  // Single self-contained page: capability tabs on the left, editor on the right.
  // Client JS deliberately avoids template literals so this whole HTML can live
  // inside one server-side template string without escaping headaches.
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CahMoney Admin Console</title>
  <style>
    :root {
      --bg: #0f1115; --surface: #171a21; --surface-2: #1f2430; --surface-3: #262c3a;
      --border: #2c3342; --text: #e6e9ef; --muted: #98a1b3; --accent: #5865f2;
      --accent-2: #57f287; --danger: #ed4245; --warn: #fee75c; --radius: 12px;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); }
    header.topbar { display: flex; align-items: center; gap: 14px; padding: 14px 20px; border-bottom: 1px solid var(--border); background: var(--surface); position: sticky; top: 0; z-index: 20; }
    header.topbar h1 { font-size: 17px; margin: 0; letter-spacing: .3px; }
    header.topbar .coin { color: var(--accent-2); }
    header.topbar .spacer { flex: 1; }
    .muted { color: var(--muted); font-size: 13px; }
    button { font-family: inherit; cursor: pointer; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); border-radius: 8px; padding: 8px 14px; font-size: 14px; }
    button:hover { background: var(--surface-3); }
    button.primary { background: var(--accent); border-color: var(--accent); }
    button.good { background: var(--accent-2); border-color: var(--accent-2); color: #06210f; }
    button.danger { background: var(--danger); border-color: var(--danger); }
    button.sm { padding: 4px 9px; font-size: 12px; }
    input, select, textarea { font-family: inherit; background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: 8px; padding: 8px 10px; font-size: 14px; width: 100%; }
    textarea { resize: vertical; min-height: 90px; font-family: ui-monospace, "Cascadia Code", monospace; font-size: 12px; }
    label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
    .field { margin-bottom: 12px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .layout { display: grid; grid-template-columns: 300px 1fr; min-height: calc(100vh - 57px); }
    aside { border-right: 1px solid var(--border); background: var(--surface); padding: 14px; overflow-y: auto; }
    main { padding: 18px 22px; overflow-y: auto; }
    .userlist { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
    .user-card { text-align: left; line-height: 1.35; }
    .user-card.active { border-color: var(--accent); background: var(--surface-3); }
    .user-card .uid { font-size: 11px; color: var(--muted); }
    .pill { display: inline-block; background: var(--surface-3); border: 1px solid var(--border); border-radius: 999px; padding: 2px 9px; font-size: 11px; margin-right: 5px; }
    .tabs { display: flex; flex-wrap: wrap; gap: 6px; border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 16px; }
    .tab-btn { border-radius: 999px; }
    .tab-btn.active { background: var(--accent); border-color: var(--accent); }
    .tab-panel { display: none; }
    .tab-panel.active { display: block; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 16px; }
    .card h3 { margin: 0 0 4px; font-size: 15px; }
    .card .hint { margin: 0 0 14px; }
    .row { display: grid; grid-template-columns: 1fr 150px; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .row:last-child { border-bottom: none; }
    .row .name { font-size: 14px; }
    .row .name small { display: block; color: var(--muted); font-size: 11px; }
    .cat-head { margin: 16px 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: .8px; color: var(--muted); }
    .pet-card { border: 1px solid var(--border); border-radius: 10px; padding: 12px; margin-bottom: 12px; background: var(--surface-2); }
    .pet-card .pet-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .pet-card .pet-head strong { flex: 1; }
    .saved-flash { position: fixed; bottom: 20px; right: 20px; background: var(--accent-2); color: #06210f; padding: 12px 18px; border-radius: 10px; font-weight: 600; opacity: 0; transition: opacity .25s; pointer-events: none; }
    .saved-flash.show { opacity: 1; }
    .saved-flash.err { background: var(--danger); color: #fff; }
    .empty { color: var(--muted); padding: 40px; text-align: center; }
    .login { max-width: 420px; margin: 80px auto; }
    .actionbar { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
    .actionbar .spacer { flex: 1; }
    @media (max-width: 820px) { .layout { grid-template-columns: 1fr; } aside { border-right: none; border-bottom: 1px solid var(--border); } .grid2, .grid3 { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header class="topbar">
    <h1><span class="coin">$</span> CahMoney Admin Console</h1>
    <span class="muted" id="storeNote"></span>
    <span class="spacer"></span>
    <button id="logoutBtn" class="sm" style="display:none" onclick="logout()">Lock</button>
  </header>

  <!-- Login gate -->
  <div id="loginView" class="login card">
    <h3>Admin token</h3>
    <p class="hint muted">Paste the ADMIN_TOKEN from your .env to unlock the console.</p>
    <div class="field"><input id="tokenInput" type="password" placeholder="ADMIN_TOKEN" autocomplete="off"></div>
    <button class="primary" onclick="login()">Unlock</button>
    <p id="loginErr" class="muted" style="color:var(--danger)"></p>
  </div>

  <!-- App -->
  <div id="appView" class="layout" style="display:none">
    <aside>
      <button class="primary" style="width:100%" onclick="createUser()">+ New / Load by ID</button>
      <div class="field" style="margin-top:12px"><input id="userSearch" placeholder="Search by ID or name" oninput="renderUserList()"></div>
      <div class="muted" id="userCount"></div>
      <div class="userlist" id="userList"></div>
    </aside>

    <main>
      <div id="noSelection" class="empty">Select a player on the left, or load one by ID, to start editing every one of their powers.</div>

      <div id="editor" style="display:none">
        <div class="actionbar">
          <div>
            <div id="editorName" style="font-size:18px;font-weight:600"></div>
            <div class="uid muted" id="editorId"></div>
          </div>
          <span class="spacer"></span>
          <span class="pill" id="netWorthPill"></span>
          <button class="good" onclick="saveUser()">Save changes</button>
          <button class="danger sm" onclick="deleteUser()">Delete user</button>
        </div>

        <div class="tabs" id="tabBar"></div>

        <!-- ECONOMY -->
        <section class="tab-panel" data-tab="economy">
          <div class="card">
            <h3>Wallet &amp; Bank</h3>
            <p class="hint muted">Spendable wallet versus stored bank balance.</p>
            <div class="grid2">
              <div class="field"><label>Wallet (coins)</label><input id="f_wallet" type="number" min="0"></div>
              <div class="field"><label>Bank (coins)</label><input id="f_bank" type="number" min="0"></div>
            </div>
            <div class="actionbar">
              <button class="sm" onclick="bump('f_wallet',1000)">+1k wallet</button>
              <button class="sm" onclick="bump('f_wallet',100000)">+100k wallet</button>
              <button class="sm" onclick="bump('f_bank',100000)">+100k bank</button>
              <button class="sm danger" onclick="setVal('f_wallet',0);setVal('f_bank',0)">Zero out</button>
            </div>
          </div>
        </section>

        <!-- INVENTORY -->
        <section class="tab-panel" data-tab="inventory">
          <div class="card">
            <h3>Inventory</h3>
            <p class="hint muted">Set a quantity for any item. Zero removes it. Every catalog item is listed.</p>
            <div class="actionbar"><button class="sm danger" onclick="clearInventory()">Clear all items</button></div>
            <div id="inventoryRows"></div>
          </div>
        </section>

        <!-- XP -->
        <section class="tab-panel" data-tab="xp">
          <div class="card">
            <h3>Experience &amp; Level</h3>
            <p class="hint muted">Player experience. Level is derived from total XP.</p>
            <div class="grid2">
              <div class="field"><label>Experience</label><input id="f_experience" type="number" min="0" oninput="updateLevelHint()"></div>
              <div class="field"><label>Player level (computed)</label><input id="f_levelHint" disabled></div>
            </div>
            <div class="actionbar">
              <button class="sm" onclick="bump('f_experience',100);updateLevelHint()">+100 XP</button>
              <button class="sm" onclick="bump('f_experience',1000);updateLevelHint()">+1000 XP</button>
              <button class="sm danger" onclick="setVal('f_experience',0);updateLevelHint()">Reset XP</button>
            </div>
          </div>
        </section>

        <!-- JOBS -->
        <section class="tab-panel" data-tab="jobs">
          <div class="card">
            <h3>Job</h3>
            <p class="hint muted">Assign a job and tune its progress, or set None to fire them.</p>
            <div class="grid2">
              <div class="field"><label>Job</label><select id="f_jobId" onchange="onJobChange()"></select></div>
              <div class="field"><label>High-tier access</label>
                <select id="f_jobHighAccess"><option value="false">No</option><option value="true">Yes (Business Card used)</option></select></div>
            </div>
            <div id="jobDetail" class="grid3">
              <div class="field"><label>Job XP</label><input id="f_jobXp" type="number" min="0"></div>
              <div class="field"><label>Job level (1-5)</label><input id="f_jobLevel" type="number" min="1" max="5"></div>
              <div class="field"><label>Fail streak (0-3)</label><input id="f_jobFail" type="number" min="0" max="3"></div>
              <div class="field"><label>Hired at</label><input id="f_jobHired" type="datetime-local"></div>
            </div>
          </div>
          <div class="card">
            <h3>Job application cooldowns</h3>
            <p class="hint muted">Next time the player may apply per tier. Clear to allow immediately.</p>
            <div class="grid3">
              <div class="field"><label>Basic</label><input id="f_cdJobBasic" type="datetime-local"><button class="sm" onclick="setVal('f_cdJobBasic','')">Clear</button></div>
              <div class="field"><label>Medium</label><input id="f_cdJobMedium" type="datetime-local"><button class="sm" onclick="setVal('f_cdJobMedium','')">Clear</button></div>
              <div class="field"><label>High</label><input id="f_cdJobHigh" type="datetime-local"><button class="sm" onclick="setVal('f_cdJobHigh','')">Clear</button></div>
            </div>
          </div>
        </section>

        <!-- PETS -->
        <section class="tab-panel" data-tab="pets">
          <div class="card">
            <h3>Pets</h3>
            <p class="hint muted">Toggle ownership and tune each pet. Stash and boosts accept JSON.</p>
            <div class="field"><label>Equipped pet</label><select id="f_equippedPet"></select></div>
            <div id="petCards"></div>
          </div>
        </section>

        <!-- BANK & DEFENSES -->
        <section class="tab-panel" data-tab="bank">
          <div class="card">
            <h3>Bank level</h3>
            <p class="hint muted">Levels 1-2 = 1 defense slot, 3-5 = 2 slots, 6-10 = 3 slots.</p>
            <div class="field" style="max-width:220px"><label>Bank level (1-10)</label><input id="f_bankLevel" type="number" min="1" max="10"></div>
          </div>
          <div class="card">
            <h3>Installed bank defenses</h3>
            <p class="hint muted">Quantity of each defense currently installed. Zero removes it.</p>
            <div id="defenseRows"></div>
          </div>
        </section>

        <!-- BOOSTS -->
        <section class="tab-panel" data-tab="boosts">
          <div class="card">
            <h3>Active boosts</h3>
            <p class="hint muted">Set an expiry time to activate a boost. Empty = inactive.</p>
            <div id="boostRows"></div>
          </div>
        </section>

        <!-- RIGGING -->
        <section class="tab-panel" data-tab="rigging">
          <div class="card">
            <h3>Rig next game</h3>
            <p class="hint muted">Force the outcome of the player's next game. "Next Game" matches whatever they play first.</p>
            <div class="field"><label>Rigging enabled</label>
              <select id="f_rigEnabled" onchange="onRigToggle()"><option value="false">Off</option><option value="true">On</option></select></div>
            <div id="rigDetail" class="grid3">
              <div class="field"><label>Game</label><select id="f_rigGame"></select></div>
              <div class="field"><label>Outcome</label><select id="f_rigOutcome"></select></div>
              <div class="field"><label>High-low forced roll (0-100, optional)</label><input id="f_rigRoll" type="number" min="0" max="100" placeholder="leave blank for random"></div>
            </div>
          </div>
        </section>

        <!-- COOLDOWNS -->
        <section class="tab-panel" data-tab="cooldowns">
          <div class="card">
            <h3>Command cooldowns</h3>
            <p class="hint muted">Last-used timestamps that gate each command. Clear to make a command available right now.</p>
            <div class="actionbar"><button class="sm danger" onclick="resetAllCooldowns()">Reset all cooldowns</button></div>
            <div id="cooldownRows" class="grid2"></div>
          </div>
        </section>

        <!-- RAW JSON -->
        <section class="tab-panel" data-tab="raw">
          <div class="card">
            <h3>Raw user JSON</h3>
            <p class="hint muted">The complete record. Edit anything here and Apply to push it into the tabs, then Save.</p>
            <div class="field"><textarea id="f_rawJson" style="min-height:340px"></textarea></div>
            <div class="actionbar">
              <button onclick="applyRawJson()">Apply JSON to tabs</button>
              <button class="sm" onclick="renderRaw()">Reload from tabs</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>

  <div id="flash" class="saved-flash"></div>

  <script>
    var TOKEN = "";
    var meta = null;
    var users = [];
    var state = { userId: null, user: null };

    var TABS = [
      ["economy", "Economy"], ["inventory", "Inventory"], ["xp", "XP & Levels"],
      ["jobs", "Jobs"], ["pets", "Pets"], ["bank", "Bank & Defenses"],
      ["boosts", "Boosts"], ["rigging", "Rigging"], ["cooldowns", "Cooldowns"], ["raw", "Raw JSON"]
    ];

    var COOLDOWNS = [
      ["lastBeg", "Beg"], ["lastWork", "Work"], ["lastDaily", "Daily"], ["lastRob", "Rob"],
      ["lastBankrob", "Bankrob"], ["lastHunt", "Hunt"], ["lastGive", "Give"], ["lastMine", "Mine"]
    ];

    // ---------- tiny dom helpers ----------
    function el(id) { return document.getElementById(id); }
    function setVal(id, v) { var e = el(id); if (e) e.value = (v === null || v === undefined) ? "" : v; }
    function getNum(id) { var e = el(id); var n = Math.floor(Number(e && e.value)); return Number.isFinite(n) && n > 0 ? n : 0; }
    function bump(id, by) { el(id).value = Math.max(0, (Math.floor(Number(el(id).value)) || 0) + by); }
    function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
    function flash(msg, isErr) {
      var f = el("flash"); f.textContent = msg; f.className = "saved-flash show" + (isErr ? " err" : "");
      setTimeout(function(){ f.className = "saved-flash" + (isErr ? " err" : ""); }, 2200);
    }

    // ms <-> datetime-local
    function toLocalInput(ms) {
      ms = Math.floor(Number(ms) || 0); if (ms <= 0) return "";
      var d = new Date(ms - new Date().getTimezoneOffset() * 60000);
      return d.toISOString().slice(0, 16);
    }
    function fromLocalInput(id) { var v = el(id).value; if (!v) return 0; var t = new Date(v).getTime(); return Number.isFinite(t) ? t : 0; }

    // ---------- auth + fetch ----------
    function headers() { return { authorization: "Bearer " + TOKEN, "content-type": "application/json" }; }
    function api(method, path, body) {
      return fetch(path, { method: method, headers: headers(), body: body ? JSON.stringify(body) : undefined })
        .then(function(r) {
          if (r.status === 401) { logout(); throw new Error("Unauthorized"); }
          return r.json().then(function(j) { if (!r.ok) throw new Error(j.error || ("HTTP " + r.status)); return j; });
        });
    }
    function login() {
      TOKEN = el("tokenInput").value.trim();
      if (!TOKEN) return;
      api("GET", "/api/meta").then(function(m) {
        meta = m;
        try { localStorage.setItem("cahAdminToken", TOKEN); } catch (e) {}
        el("loginView").style.display = "none";
        el("appView").style.display = "grid";
        el("logoutBtn").style.display = "inline-block";
        buildTabs(); buildStaticSelects(); loadUsers();
      }).catch(function(e) { el("loginErr").textContent = e.message; });
    }
    function logout() {
      TOKEN = ""; try { localStorage.removeItem("cahAdminToken"); } catch (e) {}
      el("appView").style.display = "none"; el("logoutBtn").style.display = "none";
      el("loginView").style.display = "block"; el("loginErr").textContent = "";
    }

    // ---------- tabs ----------
    function buildTabs() {
      var bar = el("tabBar"); bar.innerHTML = "";
      TABS.forEach(function(t, i) {
        var b = document.createElement("button");
        b.className = "tab-btn" + (i === 0 ? " active" : "");
        b.textContent = t[1]; b.onclick = function() { showTab(t[0]); };
        b.dataset.tab = t[0]; bar.appendChild(b);
      });
      showTab("economy");
    }
    function showTab(name) {
      var btns = document.querySelectorAll(".tab-btn");
      for (var i = 0; i < btns.length; i++) btns[i].classList.toggle("active", btns[i].dataset.tab === name);
      var panels = document.querySelectorAll(".tab-panel");
      for (var j = 0; j < panels.length; j++) panels[j].classList.toggle("active", panels[j].dataset.tab === name);
      if (name === "raw") renderRaw();
    }

    function buildStaticSelects() {
      // jobs
      var jobSel = el("f_jobId"); jobSel.innerHTML = "<option value=''>None (unemployed)</option>";
      meta.jobs.forEach(function(j) { jobSel.innerHTML += "<option value='" + j.id + "'>" + esc(j.name) + " (" + j.tier + ")</option>"; });
      // equipped pet
      var petSel = el("f_equippedPet"); petSel.innerHTML = "<option value=''>None</option>";
      meta.pets.forEach(function(p) { petSel.innerHTML += "<option value='" + p.id + "'>" + esc(p.name) + "</option>"; });
      // rig selects
      var rg = el("f_rigGame"); rg.innerHTML = "";
      meta.rigGames.forEach(function(g) { rg.innerHTML += "<option value='" + g.id + "'>" + esc(g.name) + "</option>"; });
      var ro = el("f_rigOutcome"); ro.innerHTML = "";
      meta.rigOutcomes.forEach(function(o) { ro.innerHTML += "<option value='" + o.id + "'>" + esc(o.name) + "</option>"; });
    }

    // ---------- user list ----------
    function loadUsers() {
      api("GET", "/api/users").then(function(r) { users = r.users || []; renderUserList(); });
    }
    function renderUserList() {
      var q = el("userSearch").value.trim().toLowerCase();
      var list = el("userList"); list.innerHTML = "";
      var shown = users.filter(function(u) {
        if (!q) return true;
        return u.userId.indexOf(q) >= 0 || (u.displayName || "").toLowerCase().indexOf(q) >= 0;
      });
      el("userCount").textContent = users.length + " player(s)";
      shown.forEach(function(u) {
        var b = document.createElement("button");
        b.className = "user-card" + (u.userId === state.userId ? " active" : "");
        b.onclick = function() { selectUser(u.userId); };
        b.innerHTML = "<strong>" + esc(u.displayName || "Unknown") + "</strong>" +
          "<div class='uid'>" + u.userId + "</div>" +
          "<div><span class='pill'>" + formatNum(u.wallet + u.bank) + " net</span>" +
          "<span class='pill'>" + u.items + " items</span></div>";
        list.appendChild(b);
      });
    }
    function formatNum(n) { return Number(n || 0).toLocaleString(); }

    function createUser() {
      var id = prompt("Discord user ID (snowflake) to create or load:");
      if (!id) return; id = id.trim();
      if (!/^[0-9]{10,25}$/.test(id)) { flash("Invalid Discord ID", true); return; }
      var exists = users.some(function(u) { return u.userId === id; });
      if (exists) { selectUser(id); return; }
      api("POST", "/api/users", { userId: id, user: {} }).then(function() { loadUsers(); selectUser(id); flash("User created"); })
        .catch(function(e) { flash(e.message, true); });
    }
    function deleteUser() {
      if (!state.userId) return;
      if (!confirm("Delete " + state.userId + " permanently?")) return;
      api("DELETE", "/api/users/" + state.userId).then(function() {
        state.userId = null; state.user = null; el("editor").style.display = "none";
        el("noSelection").style.display = "block"; loadUsers(); flash("User deleted");
      }).catch(function(e) { flash(e.message, true); });
    }

    function selectUser(id) {
      api("GET", "/api/users/" + id).then(function(r) {
        state.userId = id; state.user = r.user || {};
        el("noSelection").style.display = "none"; el("editor").style.display = "block";
        el("editorName").textContent = r.displayName || "Unknown player";
        el("editorId").textContent = id;
        renderAll(); renderUserList();
      }).catch(function(e) { flash(e.message, true); });
    }

    // ---------- render: state.user -> inputs ----------
    function renderAll() {
      var u = state.user;
      setVal("f_wallet", u.wallet || 0);
      setVal("f_bank", u.bank || 0);
      setVal("f_bankLevel", u.bankLevel || 1);
      setVal("f_experience", u.experience || 0);
      updateLevelHint();
      el("netWorthPill").textContent = formatNum((u.wallet || 0) + (u.bank || 0)) + " net worth";
      renderInventory(); renderDefenses(); renderBoosts(); renderPets();
      renderJob(); renderCooldowns(); renderRig();
    }

    function renderInventory() {
      var inv = state.user.inventory || {};
      var byCat = {};
      meta.items.forEach(function(it) { (byCat[it.category] = byCat[it.category] || []).push(it); });
      var root = el("inventoryRows"); root.innerHTML = "";
      Object.keys(byCat).sort().forEach(function(cat) {
        var h = document.createElement("div"); h.className = "cat-head"; h.textContent = cat; root.appendChild(h);
        byCat[cat].forEach(function(it) {
          var row = document.createElement("div"); row.className = "row";
          row.innerHTML = "<div class='name'>" + esc(it.name) + "<small>" + it.id + "</small></div>" +
            "<input type='number' min='0' class='inv-q' data-item='" + it.id + "' value='" + (inv[it.id] || 0) + "'>";
          root.appendChild(row);
        });
      });
    }
    function clearInventory() { var n = document.querySelectorAll(".inv-q"); for (var i=0;i<n.length;i++) n[i].value = 0; }

    function renderDefenses() {
      var d = state.user.bankDefenses || {};
      var root = el("defenseRows"); root.innerHTML = "";
      meta.bankDefenses.forEach(function(it) {
        var row = document.createElement("div"); row.className = "row";
        row.innerHTML = "<div class='name'>" + esc(it.name) + "<small>" + it.id + "</small></div>" +
          "<input type='number' min='0' class='def-q' data-item='" + it.id + "' value='" + (d[it.id] || 0) + "'>";
        root.appendChild(row);
      });
    }

    function renderBoosts() {
      var b = state.user.boosts || {};
      var root = el("boostRows"); root.innerHTML = "";
      meta.boosts.forEach(function(it) {
        var row = document.createElement("div"); row.className = "row";
        row.innerHTML = "<div class='name'>" + esc(it.name) + "<small>" + it.id + " — set expiry to activate</small></div>" +
          "<input type='datetime-local' class='boost-exp' data-boost='" + it.id + "'>";
        root.appendChild(row);
        var inp = row.querySelector(".boost-exp"); inp.value = toLocalInput(b[it.id]);
      });
    }

    function renderPets() {
      var pets = state.user.pets || {};
      setVal("f_equippedPet", state.user.equippedPet || "");
      var root = el("petCards"); root.innerHTML = "";
      meta.pets.forEach(function(p) {
        var owned = !!pets[p.id]; var data = pets[p.id] || {};
        var card = document.createElement("div"); card.className = "pet-card"; card.dataset.pet = p.id;
        card.innerHTML =
          "<div class='pet-head'><input type='checkbox' class='pet-owned' style='width:auto' " + (owned ? "checked" : "") + ">" +
          "<strong>" + esc(p.name) + "</strong><span class='muted'>" + p.id + "</span></div>" +
          "<div class='grid3'>" +
          "<div class='field'><label>XP</label><input type='number' min='0' class='pet-xp' value='" + (data.xp || 0) + "'></div>" +
          "<div class='field'><label>Fed until</label><input type='datetime-local' class='pet-fed'></div>" +
          "<div class='field'><label>Last idle at</label><input type='datetime-local' class='pet-idle'></div>" +
          "</div>" +
          "<div class='grid2'>" +
          "<div class='field'><label>Stash (JSON)</label><textarea class='pet-stash'></textarea></div>" +
          "<div class='field'><label>Boosts (JSON)</label><textarea class='pet-boosts'></textarea></div>" +
          "</div>";
        root.appendChild(card);
        card.querySelector(".pet-fed").value = toLocalInput(data.fedUntil);
        card.querySelector(".pet-idle").value = toLocalInput(data.lastIdleAt);
        card.querySelector(".pet-stash").value = JSON.stringify(data.stash || {}, null, 2);
        card.querySelector(".pet-boosts").value = JSON.stringify(data.boosts || {}, null, 2);
      });
    }

    function renderJob() {
      var j = state.user.job;
      setVal("f_jobId", j ? j.id : "");
      setVal("f_jobHighAccess", state.user.jobHighAccess ? "true" : "false");
      setVal("f_jobXp", j ? (j.xp || 0) : 0);
      setVal("f_jobLevel", j ? (j.level || 1) : 1);
      setVal("f_jobFail", j ? (j.failStreak || 0) : 0);
      el("f_jobHired").value = toLocalInput(j ? j.hiredAt : 0);
      var cd = state.user.jobApplyCooldowns || {};
      el("f_cdJobBasic").value = toLocalInput(cd.basic);
      el("f_cdJobMedium").value = toLocalInput(cd.medium);
      el("f_cdJobHigh").value = toLocalInput(cd.high);
      onJobChange();
    }
    function onJobChange() { el("jobDetail").style.display = el("f_jobId").value ? "grid" : "none"; }

    function renderCooldowns() {
      var u = state.user; var root = el("cooldownRows"); root.innerHTML = "";
      COOLDOWNS.forEach(function(c) {
        var row = document.createElement("div"); row.className = "field";
        row.innerHTML = "<label>" + c[1] + " last used</label>" +
          "<input type='datetime-local' class='cd-input' data-key='" + c[0] + "'>" +
          "<button class='sm' data-clear='" + c[0] + "'>Clear (ready now)</button>";
        root.appendChild(row);
        var inp = row.querySelector(".cd-input"); inp.value = toLocalInput(u[c[0]]);
        row.querySelector("button").onclick = function() { inp.value = ""; };
      });
    }
    function resetAllCooldowns() { var n = document.querySelectorAll(".cd-input"); for (var i=0;i<n.length;i++) n[i].value = ""; }

    function renderRig() {
      var r = state.user.rig;
      setVal("f_rigEnabled", r ? "true" : "false");
      if (r) { setVal("f_rigGame", r.game || "next"); setVal("f_rigOutcome", r.outcome || "win"); setVal("f_rigRoll", (r.highlowRoll === 0 || r.highlowRoll) ? r.highlowRoll : ""); }
      else { setVal("f_rigRoll", ""); }
      onRigToggle();
    }
    function onRigToggle() { el("rigDetail").style.display = el("f_rigEnabled").value === "true" ? "grid" : "none"; }

    function updateLevelHint() {
      // Mirrors getLevel: level = floor(sqrt(xp / 100)) + 1 is NOT used by the bot;
      // the bot uses a fixed curve, so we just show XP-derived estimate for reference.
      var xp = getNum("f_experience");
      setVal("f_levelHint", "~ based on " + formatNum(xp) + " XP (exact level set by bot curve)");
    }

    function renderRaw() { el("f_rawJson").value = JSON.stringify(collect(), null, 2); }
    function applyRawJson() {
      try { state.user = JSON.parse(el("f_rawJson").value); renderAll(); flash("JSON applied to tabs"); }
      catch (e) { flash("Invalid JSON: " + e.message, true); }
    }

    // ---------- collect: inputs -> user object ----------
    function collect() {
      var u = Object.assign({}, state.user); // preserve unknown fields
      u.wallet = getNum("f_wallet");
      u.bank = getNum("f_bank");
      u.bankLevel = Math.min(10, Math.max(1, Math.floor(Number(el("f_bankLevel").value)) || 1));
      u.experience = getNum("f_experience");

      // inventory
      var inv = {}; var iq = document.querySelectorAll(".inv-q");
      for (var i = 0; i < iq.length; i++) { var q = Math.floor(Number(iq[i].value)) || 0; if (q > 0) inv[iq[i].dataset.item] = q; }
      u.inventory = inv;

      // defenses
      var def = {}; var dq = document.querySelectorAll(".def-q");
      for (var d = 0; d < dq.length; d++) { var dv = Math.floor(Number(dq[d].value)) || 0; if (dv > 0) def[dq[d].dataset.item] = dv; }
      u.bankDefenses = def;

      // boosts
      var bo = {}; var be = document.querySelectorAll(".boost-exp");
      for (var b = 0; b < be.length; b++) { var t = be[b].value ? new Date(be[b].value).getTime() : 0; if (t > 0) bo[be[b].dataset.boost] = t; }
      u.boosts = bo;

      // pets
      var pets = {}; var cards = document.querySelectorAll(".pet-card");
      for (var p = 0; p < cards.length; p++) {
        var card = cards[p]; if (!card.querySelector(".pet-owned").checked) continue;
        var pid = card.dataset.pet;
        var stash = {}, pboosts = {};
        try { stash = JSON.parse(card.querySelector(".pet-stash").value || "{}"); } catch (e) { throw new Error("Pet " + pid + " stash JSON invalid"); }
        try { pboosts = JSON.parse(card.querySelector(".pet-boosts").value || "{}"); } catch (e2) { throw new Error("Pet " + pid + " boosts JSON invalid"); }
        var fed = card.querySelector(".pet-fed").value ? new Date(card.querySelector(".pet-fed").value).getTime() : 0;
        var idle = card.querySelector(".pet-idle").value ? new Date(card.querySelector(".pet-idle").value).getTime() : 0;
        pets[pid] = { id: pid, xp: Math.floor(Number(card.querySelector(".pet-xp").value)) || 0, fedUntil: fed, lastIdleAt: idle, stash: stash, boosts: pboosts };
      }
      u.pets = pets;
      var eq = el("f_equippedPet").value; u.equippedPet = (eq && pets[eq]) ? eq : null;

      // job
      var jobId = el("f_jobId").value;
      if (jobId) {
        u.job = { id: jobId, xp: getNum("f_jobXp"), level: Math.min(5, Math.max(1, Math.floor(Number(el("f_jobLevel").value)) || 1)),
          failStreak: Math.min(3, Math.max(0, Math.floor(Number(el("f_jobFail").value)) || 0)),
          hiredAt: el("f_jobHired").value ? new Date(el("f_jobHired").value).getTime() : Date.now() };
      } else { u.job = null; }
      u.jobHighAccess = el("f_jobHighAccess").value === "true";
      var jcd = {};
      var jb = fromLocalInput("f_cdJobBasic"); if (jb > 0) jcd.basic = jb;
      var jm = fromLocalInput("f_cdJobMedium"); if (jm > 0) jcd.medium = jm;
      var jh = fromLocalInput("f_cdJobHigh"); if (jh > 0) jcd.high = jh;
      u.jobApplyCooldowns = jcd;

      // cooldowns
      var cds = document.querySelectorAll(".cd-input");
      for (var c = 0; c < cds.length; c++) { u[cds[c].dataset.key] = cds[c].value ? new Date(cds[c].value).getTime() : 0; }

      // rig
      if (el("f_rigEnabled").value === "true") {
        var rig = { game: el("f_rigGame").value, outcome: el("f_rigOutcome").value, setAt: Date.now() };
        var rr = el("f_rigRoll").value;
        if (rr !== "") { var rn = Math.floor(Number(rr)); if (rn >= 0 && rn <= 100) rig.highlowRoll = rn; }
        u.rig = rig;
      } else { u.rig = null; }

      return u;
    }

    function saveUser() {
      if (!state.userId) return;
      var payload;
      try { payload = collect(); } catch (e) { flash(e.message, true); return; }
      state.user = payload;
      api("PUT", "/api/users/" + state.userId, { user: payload }).then(function(r) {
        state.user = r.user; renderAll(); loadUsers(); flash("Saved");
      }).catch(function(e) { flash(e.message, true); });
    }

    // ---------- boot ----------
    (function() {
      var saved = null; try { saved = localStorage.getItem("cahAdminToken"); } catch (e) {}
      if (saved) { el("tokenInput").value = saved; login(); }
    })();
  </script>
</body>
</html>`;
}

function startAdminServer() {
  if (!config.adminPort) return null;

  if (!config.adminToken) {
    console.warn("ADMIN_PORT is set but ADMIN_TOKEN is missing, so the admin web server was not started.");
    return null;
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (url.pathname.startsWith("/api/")) {
        await handleApi(req, res, url.pathname);
        return;
      }

      if (req.method === "GET" && url.pathname === "/") {
        send(res, 200, pageHtml(), "text/html");
        return;
      }

      send(res, 404, "Not found", "text/plain");
    } catch (error) {
      send(res, 500, { error: error.message || "Internal server error" });
    }
  });

  server.listen(config.adminPort, config.adminHost, () => {
    console.log(`Admin web editor listening on http://${config.adminHost}:${config.adminPort}`);
  });

  return server;
}

module.exports = {
  startAdminServer
};

