const http = require("node:http");
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
  ["void", "Void"]
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

function send(res, status, body, type = "application/json") {
  res.writeHead(status, {
    "content-type": `${type}; charset=utf-8`,
    "cache-control": "no-store"
  });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

function isAuthorized(req) {
  return (req.headers.authorization || "") === `Bearer ${config.adminToken}`;
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

function userSummary(userId, user) {
  return {
    userId,
    wallet: user.wallet || 0,
    bank: user.bank || 0,
    experience: user.experience || 0,
    items: Object.values(user.inventory || {}).reduce((sum, quantity) => sum + quantity, 0),
    boosts: Object.keys(user.boosts || {}).length
  };
}

async function handleApi(req, res, pathname) {
  if (!isAuthorized(req)) {
    send(res, 401, { error: "Unauthorized" });
    return;
  }

  if (req.method === "GET" && pathname === "/api/meta") {
    send(res, 200, {
      items: itemCatalog.map(([id, name]) => ({ id, name })),
      pets: petCatalog.map(([id, name]) => ({ id, name })),
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
    const users = await withStore((store) =>
      Object.entries(store.users)
        .map(([userId, user]) => userSummary(userId, user))
        .sort((a, b) => b.wallet + b.bank - (a.wallet + a.bank))
    );
    send(res, 200, { users });
    return;
  }

  const userMatch = pathname.match(/^\/api\/users\/(\d{10,25})$/);

  if (userMatch && req.method === "GET") {
    const userId = userMatch[1];
    const user = await withStore((store) => getUser(store, userId));
    send(res, 200, { userId, user });
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
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CahMoney Admin</title>
  <style>
    :root {
      --bg: #f4f7fb;
      --surface: #ffffff;
      --surface-2: #f8fafc;
      --text: #172033;
      --muted: #667085;
      --border: #d7deea;
      --primary: #2563eb;
      --primary-strong: #1d4ed8;
      --danger: #dc2626;
      --shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }
    body.dark {
      --bg: #0d1117;
      --surface: #151b23;
      --surface-2: #0f1620;
      --text: #e5edf7;
      --muted: #96a3b4;
      --border: #2b3544;
      --primary: #3b82f6;
      --primary-strong: #60a5fa;
      --danger: #ef4444;
      --shadow: none;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: var(--text); background: var(--bg); }
    header { height: 64px; padding: 0 22px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 16px; position: sticky; top: 0; z-index: 2; }
    main { display: grid; grid-template-columns: 380px 1fr; min-height: calc(100vh - 64px); }
    aside { border-right: 1px solid var(--border); background: var(--surface); padding: 16px; overflow: auto; }
    section { padding: 18px; overflow: auto; }
    h1, h2, h3 { margin: 0; }
    input, textarea, select, button { font: inherit; }
    input, textarea, select { width: 100%; border: 1px solid var(--border); border-radius: 8px; padding: 10px 11px; color: var(--text); background: var(--surface-2); }
    textarea { min-height: 120px; font-family: Consolas, monospace; }
    button { border: 0; border-radius: 8px; padding: 10px 13px; cursor: pointer; background: var(--primary); color: white; white-space: nowrap; }
    button:hover { background: var(--primary-strong); }
    button.secondary { background: #64748b; }
    button.danger { background: var(--danger); }
    label { display: block; font-size: 12px; color: var(--muted); margin: 0 0 6px; }
    dialog { border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--text); width: min(460px, calc(100vw - 32px)); }
    dialog::backdrop { background: rgba(0, 0, 0, 0.45); }
    .brand { display: flex; flex-direction: column; gap: 2px; }
    .brand span { color: var(--muted); font-size: 13px; }
    .toolbar, .bar { display: flex; gap: 8px; align-items: center; }
    .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 16px; box-shadow: var(--shadow); }
    .panel-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
    .user { border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 9px; cursor: pointer; background: var(--surface-2); }
    .user:hover, .user.active { border-color: var(--primary); }
    .user strong { display: block; margin-bottom: 5px; }
    .muted { color: var(--muted); font-size: 13px; }
    .hidden { display: none; }
    .empty { min-height: 280px; display: grid; place-content: center; text-align: center; }
    .pill { border: 1px solid var(--border); border-radius: 999px; padding: 5px 9px; color: var(--muted); font-size: 12px; }
    .rig-card { border: 1px solid var(--border); border-radius: 8px; padding: 12px; background: var(--surface-2); margin-top: 12px; }
    .inventory-row, .boost-row { display: grid; grid-template-columns: 1fr 110px 42px; gap: 8px; margin-bottom: 8px; align-items: center; }
    .boost-row { grid-template-columns: 1fr 190px 42px; }
    .pet-row { border: 1px solid var(--border); border-radius: 8px; padding: 12px; background: var(--surface-2); margin-bottom: 10px; }
    .pet-row-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 10px; }
    .pet-json { min-height: 76px; }
    #login { max-width: 430px; margin: 80px auto; }
    #status { min-height: 18px; }
    @media (max-width: 900px) {
      main { grid-template-columns: 1fr; }
      aside { border-right: 0; border-bottom: 1px solid var(--border); }
      .grid-3, .grid-2 { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div id="login" class="panel">
    <h1>CahMoney Admin</h1>
    <p class="muted">Enter your admin token to edit economy data.</p>
    <input id="token" type="password" autocomplete="current-password" placeholder="ADMIN_TOKEN">
    <div class="bar" style="margin-top:12px"><button onclick="login()">Login</button><button class="secondary" onclick="toggleTheme()">Dark Mode</button></div>
  </div>

  <div id="app" class="hidden">
    <header>
      <div class="brand"><h2>CahMoney Admin</h2><span>Economy data editor</span></div>
      <div class="toolbar">
        <button class="secondary" onclick="toggleTheme()">Theme</button>
        <button class="secondary" onclick="loadUsers()">Refresh</button>
        <button class="secondary" onclick="logout()">Logout</button>
      </div>
    </header>
    <main>
      <aside>
        <div class="bar">
          <input id="search" placeholder="Search user ID" oninput="renderUsers()">
          <button onclick="newUser()">New</button>
        </div>
        <p id="userCount" class="muted"></p>
        <div id="users"></div>
      </aside>
      <section>
        <div id="empty" class="panel empty">
          <div>
            <h2>Select a user</h2>
            <p class="muted">Choose a user on the left or create a new one.</p>
          </div>
        </div>

        <form id="editor" class="hidden" onsubmit="saveUser(event)">
          <div class="panel">
            <div class="panel-head">
              <div>
                <h2>User</h2>
                <p class="muted">Discord ID and primary economy values.</p>
              </div>
              <div class="bar">
                <button type="submit">Save</button>
                <button type="button" class="danger" onclick="deleteUser()">Delete</button>
              </div>
            </div>
            <div class="grid-2">
              <div><label>Discord User ID</label><input id="userId" placeholder="123456789012345678"></div>
            </div>
              <div class="grid-3">
               <div><label>Wallet</label><input id="wallet" type="number" min="0"></div>
               <div><label>Bank</label><input id="bank" type="number" min="0"></div>
               <div><label>Bank Level</label><input id="bankLevel" type="number" min="1" max="10"></div>
             </div>
             <div class="grid-3">
                <div><label>Experience</label><input id="experience" type="number" min="0"></div>
              </div>
            </div>

          <div class="panel">
            <div class="panel-head">
              <div>
                <h2>Game Rigging</h2>
                <p class="muted">Set the user's next game outcome.</p>
              </div>
              <button type="button" class="secondary" onclick="clearRig()">Clear Rig</button>
            </div>
            <div class="grid-2">
              <div><label>Game</label><select id="rigGame"></select></div>
              <div><label>Outcome</label><select id="rigOutcome"></select></div>
            </div>
            <div class="grid-2">
              <div><label>Highlow Next Roll</label><input id="rigHighlowRoll" type="number" min="0" max="100" placeholder="blank = random"></div>
            </div>
            <label><input id="rigEnabled" type="checkbox" style="width:auto;margin-right:8px"> Rig this user's next matching game</label>
            <div id="rigPreview" class="rig-card muted">No rig active.</div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div>
                <h2>Inventory</h2>
                <p class="muted">Pick items by friendly name; IDs are shown in the list.</p>
              </div>
              <button type="button" onclick="openItemModal()">Add Item</button>
            </div>
            <div id="inventory"></div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div>
                <h2>Pets</h2>
                <p class="muted">Edit owned pets, equipped pet, XP, food time, and stash.</p>
              </div>
              <button type="button" onclick="openPetModal()">Add Pet</button>
            </div>
            <div class="grid-2">
              <div><label>Equipped Pet</label><select id="equippedPet"></select></div>
            </div>
            <div id="pets"></div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div>
                <h2>Boosts</h2>
                <p class="muted">Add timed boosts without editing JSON.</p>
              </div>
              <button type="button" onclick="openBoostModal()">Add Boost</button>
            </div>
            <div id="boosts"></div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div>
                <h2>Cooldowns</h2>
                <p class="muted">Unix millisecond timestamps used by commands.</p>
              </div>
            </div>
            <div class="grid-3">
              <div><label>Last Beg</label><input id="lastBeg" type="number" min="0"></div>
              <div><label>Last Work</label><input id="lastWork" type="number" min="0"></div>
              <div><label>Last Daily</label><input id="lastDaily" type="number" min="0"></div>
            </div>
            <div class="grid-3">
              <div><label>Last Rob</label><input id="lastRob" type="number" min="0"></div>
              <div><label>Last Bankrob</label><input id="lastBankrob" type="number" min="0"></div>
              <div><label>Last Hunt</label><input id="lastHunt" type="number" min="0"></div>
            </div>
            <div class="grid-3">
              <div><label>Last Give</label><input id="lastGive" type="number" min="0"></div>
              <div><label>Last Mine</label><input id="lastMine" type="number" min="0"></div>
              <div><label>Status</label><div id="status" class="pill"></div></div>
            </div>
          </div>
        </form>
      </section>
    </main>
  </div>

  <dialog id="itemModal">
    <form method="dialog" onsubmit="addItemFromModal(event)">
      <h3>Add Item</h3>
      <p class="muted">Choose an item by name.</p>
      <div class="grid-2">
        <div><label>Item</label><select id="itemToAdd"></select></div>
        <div><label>Quantity</label><input id="itemQuantity" type="number" min="1" value="1"></div>
      </div>
      <div class="bar"><button>Add</button><button type="button" class="secondary" onclick="closeDialog('itemModal')">Cancel</button></div>
    </form>
  </dialog>

  <dialog id="boostModal">
    <form method="dialog" onsubmit="addBoostFromModal(event)">
      <h3>Add Boost</h3>
      <p class="muted">Duration starts from the moment you save this user.</p>
      <div class="grid-2">
        <div><label>Boost</label><select id="boostToAdd"></select></div>
        <div><label>Minutes</label><input id="boostMinutes" type="number" min="1" value="5"></div>
      </div>
      <div class="bar"><button>Add</button><button type="button" class="secondary" onclick="closeDialog('boostModal')">Cancel</button></div>
    </form>
  </dialog>

  <dialog id="petModal">
    <form method="dialog" onsubmit="addPetFromModal(event)">
      <h3>Add Pet</h3>
      <p class="muted">Choose a pet to add to this user.</p>
      <div class="grid-2">
        <div><label>Pet</label><select id="petToAdd"></select></div>
        <div><label>Starting XP</label><input id="petStartingXp" type="number" min="0" value="0"></div>
      </div>
      <div class="bar"><button>Add</button><button type="button" class="secondary" onclick="closeDialog('petModal')">Cancel</button></div>
    </form>
  </dialog>

<script>
const numberFields = ["wallet","bank","bankLevel","experience","lastBeg","lastWork","lastDaily","lastRob","lastBankrob","lastHunt","lastGive","lastMine"];
let users = [];
let items = [];
let pets = [];
let boosts = [];
let rigGames = [];
let rigOutcomes = [];
let selected = null;
let activeBankDefenses = {};

function applyTheme() {
  document.body.classList.toggle("dark", localStorage.adminTheme === "dark");
}

function toggleTheme() {
  localStorage.adminTheme = localStorage.adminTheme === "dark" ? "light" : "dark";
  applyTheme();
}

function authHeaders() {
  return { authorization: "Bearer " + localStorage.adminToken, "content-type": "application/json" };
}

async function api(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const requestPath = method === "GET"
    ? path + (path.includes("?") ? "&" : "?") + "_=" + Date.now()
    : path;
  const res = await fetch(requestPath, {
    cache: "no-store",
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body;
}

function login() {
  localStorage.adminToken = document.getElementById("token").value;
  boot();
}

function logout() {
  localStorage.removeItem("adminToken");
  location.reload();
}

async function boot() {
  applyTheme();
  if (!localStorage.adminToken) return;
  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  const meta = await api("/api/meta");
  items = meta.items;
  pets = meta.pets;
  boosts = meta.boosts;
  rigGames = meta.rigGames;
  rigOutcomes = meta.rigOutcomes;
  fillSelect("itemToAdd", items);
  fillSelect("petToAdd", pets);
  fillSelect("boostToAdd", boosts);
  fillSelect("rigGame", rigGames);
  fillSelect("rigOutcome", rigOutcomes);
  await loadUsers();
}

function fillSelect(id, rows) {
  document.getElementById(id).innerHTML = rows.map((row) =>
    "<option value='" + row.id + "'>" + row.name + " (" + row.id + ")</option>"
  ).join("");
}

async function loadUsers() {
  users = (await api("/api/users")).users;
  renderUsers();
  if (!selected) return;

  if (!users.some((user) => user.userId === selected)) {
    selected = null;
    document.getElementById("editor").classList.add("hidden");
    document.getElementById("empty").classList.remove("hidden");
    return;
  }

  const data = await api("/api/users/" + selected);
  showEditor(data.userId, data.user);
}

function renderUsers() {
  const q = document.getElementById("search").value.trim();
  const root = document.getElementById("users");
  const filtered = users.filter((user) => user.userId.includes(q));
  document.getElementById("userCount").textContent = filtered.length + " user(s)";
  root.innerHTML = "";
  filtered.forEach((user) => {
    const el = document.createElement("div");
    el.className = "user" + (selected === user.userId ? " active" : "");
    el.innerHTML = "<strong>" + user.userId + "</strong><div class='muted'>Net " + (user.wallet + user.bank).toLocaleString() + " | XP " + user.experience.toLocaleString() + " | Items " + user.items.toLocaleString() + " | Boosts " + user.boosts.toLocaleString() + "</div>";
    el.onclick = () => loadUser(user.userId);
    root.appendChild(el);
  });
}

async function loadUser(userId) {
  const data = await api("/api/users/" + userId);
  selected = userId;
  renderUsers();
  showEditor(data.userId, data.user);
}

function showEditor(userId, user) {
  document.getElementById("empty").classList.add("hidden");
  document.getElementById("editor").classList.remove("hidden");
  document.getElementById("userId").value = userId;
  numberFields.forEach((field) => document.getElementById(field).value = user[field] || 0);
  document.getElementById("bankLevel").value = user.bankLevel || 1;
  activeBankDefenses = user.bankDefenses || {};
  renderRig(user.rig || null);
  renderInventory(user.inventory || {});
  renderPets(user.pets || {}, user.equippedPet || null);
  renderBoosts(user.boosts || {});
  status("");
}

function renderRig(rig) {
  const enabled = Boolean(rig?.game && rig?.outcome);
  document.getElementById("rigEnabled").checked = enabled;
  document.getElementById("rigGame").value = rig?.game || "next";
  document.getElementById("rigOutcome").value = rig?.outcome || "win";
  document.getElementById("rigHighlowRoll").value = Number.isInteger(rig?.highlowRoll) ? rig.highlowRoll : "";
  updateRigPreview();
}

function updateRigPreview() {
  const enabled = document.getElementById("rigEnabled").checked;
  const game = document.getElementById("rigGame").value;
  const outcome = document.getElementById("rigOutcome").value;
  const highlowRoll = document.getElementById("rigHighlowRoll").value;
  const preview = document.getElementById("rigPreview");

  preview.textContent = enabled
    ? "Active: " + game + " -> " + outcome + (game === "highlow" && highlowRoll !== "" ? " | next roll " + highlowRoll + "%" : "")
    : "No rig active.";
}

function clearRig() {
  document.getElementById("rigEnabled").checked = false;
  updateRigPreview();
}

function itemName(itemId) {
  return items.find((item) => item.id === itemId)?.name || itemId;
}

function boostName(boostId) {
  return boosts.find((boost) => boost.id === boostId)?.name || boostId;
}

function petName(petId) {
  return pets.find((pet) => pet.id === petId)?.name || petId;
}

function renderInventory(inventory) {
  const root = document.getElementById("inventory");
  root.innerHTML = "";
  Object.entries(inventory).sort(([a], [b]) => a.localeCompare(b)).forEach(([itemId, quantity]) => addItemRow(itemId, quantity));
}

function addItemRow(itemId, quantity) {
  const root = document.getElementById("inventory");
  const row = document.createElement("div");
  row.className = "inventory-row";
  row.dataset.itemId = itemId;
  row.innerHTML = "<div><strong>" + itemName(itemId) + "</strong><div class='muted'>" + itemId + "</div></div><input class='item-quantity' type='number' min='0' value='" + quantity + "'><button type='button' class='danger'>x</button>";
  row.querySelector("button").onclick = () => row.remove();
  root.appendChild(row);
}

function renderEquippedPetOptions(equippedPet) {
  const select = document.getElementById("equippedPet");
  const rows = [...document.querySelectorAll(".pet-row")].map((row) => row.dataset.petId);
  select.innerHTML = "<option value=''>None</option>" + rows.map((petId) =>
    "<option value='" + petId + "'>" + petName(petId) + " (" + petId + ")</option>"
  ).join("");
  select.value = rows.includes(equippedPet) ? equippedPet : "";
}

function renderPets(activePets, equippedPet) {
  const root = document.getElementById("pets");
  root.innerHTML = "";
  Object.entries(activePets).sort(([a], [b]) => a.localeCompare(b)).forEach(([petId, pet]) => addPetRow(petId, pet, false));
  renderEquippedPetOptions(equippedPet);
}

function addPetRow(petId, pet = {}, refreshEquipped = true) {
  const root = document.getElementById("pets");
  const existing = [...document.querySelectorAll(".pet-row")].find((row) => row.dataset.petId === petId);
  if (existing) existing.remove();

  const xp = Math.max(0, Math.floor(Number(pet.xp) || 0));
  const row = document.createElement("div");
  row.className = "pet-row";
  row.dataset.petId = petId;
  row.innerHTML =
    "<div class='pet-row-head'><div><strong>" + petName(petId) + "</strong><div class='muted'>" + petId + "</div></div><button type='button' class='danger'>x</button></div>" +
    "<div class='grid-3'>" +
      "<div><label>XP</label><input class='pet-xp' type='number' min='0' value='" + xp + "'></div>" +
      "<div><label>Fed Until</label><input class='pet-fed-until' type='datetime-local'></div>" +
      "<div><label>Last Idle At</label><input class='pet-last-idle' type='datetime-local'></div>" +
    "</div>" +
    "<div class='grid-2'>" +
      "<div><label>Stash JSON</label><textarea class='pet-stash pet-json'></textarea></div>" +
      "<div><label>Boosts JSON</label><textarea class='pet-boosts pet-json'></textarea></div>" +
    "</div>";

  row.querySelector(".pet-fed-until").value = Number(pet.fedUntil) > 0 ? toDateTimeLocal(pet.fedUntil) : "";
  row.querySelector(".pet-last-idle").value = Number(pet.lastIdleAt) > 0 ? toDateTimeLocal(pet.lastIdleAt) : "";
  row.querySelector(".pet-stash").value = JSON.stringify(pet.stash || {}, null, 2);
  row.querySelector(".pet-boosts").value = JSON.stringify(pet.boosts || {}, null, 2);
  row.querySelector("button").onclick = () => {
    row.remove();
    renderEquippedPetOptions(document.getElementById("equippedPet").value);
  };
  root.appendChild(row);
  if (refreshEquipped) renderEquippedPetOptions(document.getElementById("equippedPet").value);
}

function renderBoosts(activeBoosts) {
  const root = document.getElementById("boosts");
  root.innerHTML = "";
  Object.entries(activeBoosts).sort(([a], [b]) => a.localeCompare(b)).forEach(([boostId, expiresAt]) => addBoostRow(boostId, expiresAt));
}

function addBoostRow(boostId, expiresAt) {
  const root = document.getElementById("boosts");
  const row = document.createElement("div");
  row.className = "boost-row";
  row.dataset.boostId = boostId;
  row.innerHTML = "<div><strong>" + boostName(boostId) + "</strong><div class='muted'>" + boostId + "</div></div><input class='boost-expires' type='datetime-local'><button type='button' class='danger'>x</button>";
  row.querySelector(".boost-expires").value = toDateTimeLocal(expiresAt);
  row.querySelector("button").onclick = () => row.remove();
  root.appendChild(row);
}

function openItemModal() {
  document.getElementById("itemQuantity").value = 1;
  document.getElementById("itemModal").showModal();
}

function addItemFromModal(event) {
  event.preventDefault();
  const itemId = document.getElementById("itemToAdd").value;
  const quantity = Number(document.getElementById("itemQuantity").value) || 1;
  const existing = [...document.querySelectorAll(".inventory-row")].find((row) => row.dataset.itemId === itemId);
  if (existing) {
    const input = existing.querySelector(".item-quantity");
    input.value = (Number(input.value) || 0) + quantity;
  } else {
    addItemRow(itemId, quantity);
  }
  closeDialog("itemModal");
}

function openPetModal() {
  document.getElementById("petStartingXp").value = 0;
  document.getElementById("petModal").showModal();
}

function addPetFromModal(event) {
  event.preventDefault();
  const petId = document.getElementById("petToAdd").value;
  const xp = Number(document.getElementById("petStartingXp").value) || 0;
  addPetRow(petId, {
    id: petId,
    xp,
    level: Math.floor(xp / 100) + 1,
    fedUntil: 0,
    lastIdleAt: Date.now(),
    stash: {},
    boosts: {}
  });
  closeDialog("petModal");
}

function openBoostModal() {
  document.getElementById("boostMinutes").value = 5;
  document.getElementById("boostModal").showModal();
}

function addBoostFromModal(event) {
  event.preventDefault();
  const boostId = document.getElementById("boostToAdd").value;
  const minutes = Number(document.getElementById("boostMinutes").value) || 5;
  const expiresAt = Date.now() + minutes * 60 * 1000;
  const existing = [...document.querySelectorAll(".boost-row")].find((row) => row.dataset.boostId === boostId);
  if (existing) {
    existing.querySelector(".boost-expires").value = toDateTimeLocal(expiresAt);
  } else {
    addBoostRow(boostId, expiresAt);
  }
  closeDialog("boostModal");
}

function closeDialog(id) {
  document.getElementById(id).close();
}

function toDateTimeLocal(value) {
  const date = new Date(Number(value) || Date.now());
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value) {
  return value ? new Date(value).getTime() : 0;
}

function collectUser() {
  const user = {};
  numberFields.forEach((field) => user[field] = Number(document.getElementById(field).value) || 0);
  user.bankDefenses = activeBankDefenses;
  user.inventory = {};
  document.querySelectorAll(".inventory-row").forEach((row) => {
    const quantity = Number(row.querySelector(".item-quantity").value) || 0;
    if (quantity > 0) user.inventory[row.dataset.itemId] = Math.floor(quantity);
  });
  user.equippedPet = document.getElementById("equippedPet").value || null;
  user.pets = {};
  document.querySelectorAll(".pet-row").forEach((row) => {
    const petId = row.dataset.petId;
    const xp = Math.max(0, Math.floor(Number(row.querySelector(".pet-xp").value) || 0));
    const fedUntil = fromDateTimeLocal(row.querySelector(".pet-fed-until").value);
    const lastIdleAt = fromDateTimeLocal(row.querySelector(".pet-last-idle").value);
    let stash = {};
    let boosts = {};

    try {
      stash = JSON.parse(row.querySelector(".pet-stash").value || "{}");
    } catch {
      stash = {};
    }

    try {
      boosts = JSON.parse(row.querySelector(".pet-boosts").value || "{}");
    } catch {
      boosts = {};
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
  });
  if (user.equippedPet && !user.pets[user.equippedPet]) user.equippedPet = null;
  user.boosts = {};
  document.querySelectorAll(".boost-row").forEach((row) => {
    const expiresAt = fromDateTimeLocal(row.querySelector(".boost-expires").value);
    if (expiresAt > 0) user.boosts[row.dataset.boostId] = expiresAt;
  });
  user.rig = document.getElementById("rigEnabled").checked
    ? (() => {
        const rig = {
        game: document.getElementById("rigGame").value,
        outcome: document.getElementById("rigOutcome").value,
        setAt: Date.now()
        };
        const highlowRoll = Number(document.getElementById("rigHighlowRoll").value);
        if (rig.game === "highlow" && Number.isInteger(highlowRoll) && highlowRoll >= 0 && highlowRoll <= 100) {
          rig.highlowRoll = highlowRoll;
        }
        return rig;
      })()
    : null;
  return user;
}

async function saveUser(event) {
  event.preventDefault();
  const userId = document.getElementById("userId").value.trim();
  const exists = users.some((user) => user.userId === userId);
  const method = exists ? "PUT" : "POST";
  const path = exists ? "/api/users/" + userId : "/api/users";
  const payload = exists ? { user: collectUser() } : { userId, user: collectUser() };
  const result = await api(path, { method, body: JSON.stringify(payload) });
  selected = result.userId;
  status("Saved " + result.userId);
  await loadUsers();
}

async function deleteUser() {
  const userId = document.getElementById("userId").value.trim();
  if (!confirm("Delete " + userId + "?")) return;
  await api("/api/users/" + userId, { method: "DELETE" });
  selected = null;
  document.getElementById("editor").classList.add("hidden");
  document.getElementById("empty").classList.remove("hidden");
  await loadUsers();
}

function newUser() {
  selected = null;
  renderUsers();
  showEditor("", {});
}

function status(text) {
  document.getElementById("status").textContent = text;
}

applyTheme();
boot().catch((error) => alert(error.message));
document.addEventListener("change", (event) => {
  if (["rigEnabled", "rigGame", "rigOutcome", "rigHighlowRoll"].includes(event.target.id)) updateRigPreview();
});
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
