const http = require("node:http");
const { URL } = require("node:url");
const { config } = require("./config");
const { getUser, withStore } = require("./economyStore");

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

const itemIds = [
  "xp_potion", "cash_potion", "dirt", "lucky_charm", "broken_phone", "rubber_duck", "gold_ring",
  "mystery_block", "fake_id", "shiny_rock", "wooden_pickaxe", "stone_pickaxe", "iron_pickaxe",
  "gold_pickaxe", "diamond_pickaxe", "netherite_pickaxe", "cobblestone", "coal", "iron", "raw_gold",
  "redstone", "diamond", "emerald", "end_stone", "netherite_ingot", "ruby"
];

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

function authorized(req) {
  return (req.headers.authorization || "") === `Bearer ${config.adminToken}`;
}

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("Request body too large.");
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function clean(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const user = { ...DEFAULT_USER, ...source };
  for (const key of ["wallet", "bank", "experience", "lastBeg", "lastWork", "lastDaily", "lastRob", "lastBankrob", "lastHunt", "lastGive", "lastMine"]) {
    user[key] = Math.max(0, Math.floor(Number(user[key]) || 0));
  }
  user.inventory = source.inventory && typeof source.inventory === "object" && !Array.isArray(source.inventory) ? source.inventory : {};
  user.boosts = source.boosts && typeof source.boosts === "object" && !Array.isArray(source.boosts) ? source.boosts : {};
  user.rig = source.rig || null;
  for (const [itemId, quantity] of Object.entries(user.inventory)) {
    const amount = Math.floor(Number(quantity) || 0);
    if (amount > 0) user.inventory[itemId] = amount;
    else delete user.inventory[itemId];
  }
  return user;
}

async function api(req, res, pathname) {
  if (!authorized(req)) return send(res, 401, { error: "Unauthorized" });
  if (req.method === "GET" && pathname === "/api/items") return send(res, 200, { items: itemIds });
  if (req.method === "GET" && pathname === "/api/users") {
    const users = await withStore((store) => Object.entries(store.users).map(([userId, user]) => ({
      userId,
      wallet: user.wallet || 0,
      bank: user.bank || 0,
      experience: user.experience || 0,
      items: Object.values(user.inventory || {}).reduce((sum, quantity) => sum + quantity, 0)
    })).sort((a, b) => b.wallet + b.bank - (a.wallet + a.bank)));
    return send(res, 200, { users });
  }
  const match = pathname.match(/^\/api\/users\/(\d{10,25})$/);
  if (match && req.method === "GET") {
    const userId = match[1];
    const user = await withStore((store) => getUser(store, userId));
    return send(res, 200, { userId, user });
  }
  if (match && req.method === "PUT") {
    const userId = match[1];
    const payload = await body(req);
    const user = clean(payload.user);
    await withStore((store) => { store.users[userId] = user; });
    return send(res, 200, { ok: true, userId, user });
  }
  if (match && req.method === "DELETE") {
    await withStore((store) => { delete store.users[match[1]]; });
    return send(res, 200, { ok: true });
  }
  if (req.method === "POST" && pathname === "/api/users") {
    const payload = await body(req);
    const userId = String(payload.userId || "").trim();
    if (!/^\d{10,25}$/.test(userId)) return send(res, 400, { error: "User ID must be a Discord snowflake." });
    const user = clean(payload.user);
    await withStore((store) => { store.users[userId] = user; });
    return send(res, 201, { ok: true, userId, user });
  }
  send(res, 404, { error: "Not found" });
}

function html() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CahMoney Admin</title><style>
body{margin:0;font-family:Arial,sans-serif;background:#f5f7fb;color:#1e2329}header{background:#121826;color:#fff;padding:16px 22px;display:flex;justify-content:space-between}main{display:grid;grid-template-columns:360px 1fr;min-height:calc(100vh - 58px)}aside{background:#fff;border-right:1px solid #d7dce5;padding:14px;overflow:auto}section{padding:16px}.panel{background:#fff;border:1px solid #dbe1ea;border-radius:8px;padding:14px;margin-bottom:14px}input,textarea,button{font:inherit}input,textarea{width:100%;border:1px solid #c7ced9;border-radius:6px;padding:8px}textarea{min-height:120px;font-family:Consolas,monospace}button{border:0;border-radius:6px;padding:8px 11px;background:#2563eb;color:#fff;cursor:pointer}.secondary{background:#64748b}.danger{background:#dc2626}.bar{display:flex;gap:8px;margin-bottom:10px}.row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}.user{border:1px solid #e0e5ef;border-radius:6px;padding:9px;margin-bottom:8px;cursor:pointer}.user:hover,.active{border-color:#2563eb}.muted{color:#667085;font-size:13px}.inv{display:grid;grid-template-columns:1fr 90px 36px;gap:8px;margin-bottom:8px}.hidden{display:none}#login{max-width:420px;margin:80px auto}@media(max-width:900px){main{grid-template-columns:1fr}}
</style></head><body><div id="login" class="panel"><h1>CahMoney Admin</h1><p class="muted">Enter ADMIN_TOKEN.</p><input id="token" type="password"><div class="bar" style="margin-top:12px"><button onclick="login()">Login</button></div></div><div id="app" class="hidden"><header><strong>CahMoney Admin</strong><div class="bar" style="margin:0"><button class="secondary" onclick="loadUsers()">Refresh</button><button class="secondary" onclick="logout()">Logout</button></div></header><main><aside><div class="bar"><input id="search" placeholder="Search user ID" oninput="renderUsers()"><button onclick="newUser()">New</button></div><div id="users"></div></aside><section><div id="empty" class="panel">Select a user or create one.</div><form id="editor" class="hidden" onsubmit="saveUser(event)"><div class="panel"><div class="bar"><input id="userId" placeholder="Discord user ID"><button>Save</button><button type="button" class="danger" onclick="deleteUser()">Delete</button></div><div id="fields"></div><label>Rig JSON</label><input id="rig" placeholder="null"></div><div class="panel"><div class="bar"><strong>Inventory</strong><button type="button" onclick="addItem()">Add Item</button></div><div id="inventory"></div></div><div class="panel"><label>Boosts JSON</label><textarea id="boosts"></textarea></div><p id="status" class="muted"></p></form></section></main></div><script>
const nums=["wallet","bank","experience","lastBeg","lastWork","lastDaily","lastRob","lastBankrob","lastHunt","lastGive","lastMine"];let users=[],items=[],selected=null;function headers(){return{authorization:"Bearer "+localStorage.adminToken,"content-type":"application/json"}}async function api(p,o={}){const r=await fetch(p,{...o,headers:{...headers(),...(o.headers||{})}});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.error||"Request failed");return b}function login(){localStorage.adminToken=document.getElementById("token").value;boot()}function logout(){localStorage.removeItem("adminToken");location.reload()}async function boot(){if(!localStorage.adminToken)return;document.getElementById("login").classList.add("hidden");document.getElementById("app").classList.remove("hidden");items=(await api("/api/items")).items;await loadUsers()}async function loadUsers(){users=(await api("/api/users")).users;renderUsers()}function renderUsers(){const q=document.getElementById("search").value.trim(),root=document.getElementById("users");root.innerHTML="";users.filter(u=>u.userId.includes(q)).forEach(u=>{const el=document.createElement("div");el.className="user"+(selected===u.userId?" active":"");el.innerHTML="<strong>"+u.userId+"</strong><div class='muted'>Net "+(u.wallet+u.bank).toLocaleString()+" | XP "+u.experience.toLocaleString()+" | Items "+u.items.toLocaleString()+"</div>";el.onclick=()=>loadUser(u.userId);root.appendChild(el)})}async function loadUser(id){const d=await api("/api/users/"+id);selected=id;renderUsers();showEditor(d.userId,d.user)}function showEditor(id,u){document.getElementById("empty").classList.add("hidden");document.getElementById("editor").classList.remove("hidden");document.getElementById("userId").value=id;const f=document.getElementById("fields");f.innerHTML="";for(let i=0;i<nums.length;i+=3){const row=document.createElement("div");row.className="row";nums.slice(i,i+3).forEach(k=>row.innerHTML+="<div><label>"+k+"</label><input id='"+k+"' type='number' min='0' value='"+(u[k]||0)+"'></div>");f.appendChild(row)}document.getElementById("rig").value=JSON.stringify(u.rig??null);document.getElementById("boosts").value=JSON.stringify(u.boosts||{},null,2);renderInv(u.inventory||{});status("")}function renderInv(inv){const root=document.getElementById("inventory");root.innerHTML="";Object.entries(inv).sort(([a],[b])=>a.localeCompare(b)).forEach(([id,q])=>addItem(id,q))}function addItem(id="",q=1){let dl=document.getElementById("item-list");if(!dl){dl=document.createElement("datalist");dl.id="item-list";dl.innerHTML=items.map(i=>"<option value='"+i+"'>").join("");document.body.appendChild(dl)}const row=document.createElement("div");row.className="inv";row.innerHTML="<input list='item-list' class='item-id' value='"+id+"' placeholder='item_id'><input class='item-q' type='number' min='0' value='"+q+"'><button type='button' class='danger'>x</button>";row.querySelector("button").onclick=()=>row.remove();document.getElementById("inventory").appendChild(row)}function collect(){const u={inventory:{}};nums.forEach(k=>u[k]=Number(document.getElementById(k).value)||0);document.querySelectorAll(".inv").forEach(r=>{const id=r.querySelector(".item-id").value.trim(),q=Number(r.querySelector(".item-q").value)||0;if(id&&q>0)u.inventory[id]=Math.floor(q)});u.boosts=JSON.parse(document.getElementById("boosts").value||"{}");u.rig=JSON.parse(document.getElementById("rig").value||"null");return u}async function saveUser(e){e.preventDefault();const id=document.getElementById("userId").value.trim(),exists=users.some(u=>u.userId===id),method=exists?"PUT":"POST",path=exists?"/api/users/"+id:"/api/users",payload=exists?{user:collect()}:{userId:id,user:collect()};const r=await api(path,{method,body:JSON.stringify(payload)});selected=r.userId;status("Saved "+r.userId);await loadUsers()}async function deleteUser(){const id=document.getElementById("userId").value.trim();if(!confirm("Delete "+id+"?"))return;await api("/api/users/"+id,{method:"DELETE"});selected=null;document.getElementById("editor").classList.add("hidden");document.getElementById("empty").classList.remove("hidden");await loadUsers()}function newUser(){selected=null;renderUsers();showEditor("",{})}function status(t){document.getElementById("status").textContent=t}boot().catch(e=>alert(e.message));
</script></body></html>`;
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
      if (url.pathname.startsWith("/api/")) return await api(req, res, url.pathname);
      if (req.method === "GET" && url.pathname === "/") return send(res, 200, html(), "text/html");
      send(res, 404, "Not found", "text/plain");
    } catch (error) {
      send(res, 500, { error: error.message || "Internal server error" });
    }
  });
  server.listen(config.adminPort, config.adminHost, () => console.log(`Admin web editor listening on http://${config.adminHost}:${config.adminPort}`));
  return server;
}

module.exports = { startAdminServer };
