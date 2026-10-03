// server.js — Quiz Clash authoritative server (v2). Zero npm deps; Node built-ins only.
// Downstream: SSE. Upstream: POST. Server owns: questions, timer, streaks, energy/skill, items, HP, result.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const { CONFIG, CHARACTERS, ITEMS, EMOJIS } = require('./public/js/config.js');
const QUESTIONS = require('./public/js/questions.js');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const CHAR_IDS = new Set(CHARACTERS.map(c => c.id));
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon'
};
const rooms = new Map();

// ---------------- utils ----------------
function randCode(n = 6) {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += a[crypto.randomInt(a.length)];
  return s;
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function lanIPs() {
  const out = [];
  for (const name of Object.keys(os.networkInterfaces()))
    for (const ni of os.networkInterfaces()[name] || [])
      if (ni.family === 'IPv4' && !ni.internal) out.push(ni.address);
  return out;
}
function cleanName(v) {
  const s = String(v == null ? '' : v).trim().slice(0, 12);
  return s || ('Player' + crypto.randomInt(100, 999));
}
function makePlayer(name, charId, isHost) {
  return {
    id: crypto.randomUUID(), token: crypto.randomBytes(12).toString('hex'),
    name, char: charId, ready: false, isHost, connected: false, res: null, hb: null,
    hp: CONFIG.maxHp, streak: 0, maxStreak: 0, energy: 0, skillBuff: false, cooldownUntil: 0,
    shields: 0, itemBag: { insight: 0, heal: 0 }, correctSince: 0,
    stats: { correct: 0, wrong: 0, fastestMs: null }
  };
}
function resetForMatch(p) {
  p.hp = CONFIG.maxHp; p.streak = 0; p.maxStreak = 0; p.energy = 0; p.skillBuff = false; p.cooldownUntil = 0;
  p.shields = 0; p.itemBag = { insight: 0, heal: 0 }; p.correctSince = 0;
  p.stats = { correct: 0, wrong: 0, fastestMs: null };
}

class QuestionBank {
  constructor(list) { this.all = list; this.reset(); }
  reset() { this.deck = shuffle(this.all); this.last = null; }
  next() {
    if (this.deck.length === 0) this.reset();
    let idx = this.deck.length - 1;
    if (this.deck[idx].id === this.last && this.all.length > 1) idx = crypto.randomInt(this.deck.length);
    const [q] = this.deck.splice(idx, 1); this.last = q.id;
    return q;
  }
}

// ---------------- match ----------------
class ServerMatch {
  constructor(room) {
    this.room = room; this.bank = new QuestionBank(QUESTIONS);
    this.current = null; this.timer = null; this.locked = new Set(); this.sentAt = 0; this.round = 0;
  }
  begin() {
    for (const p of this.room.players.values()) resetForMatch(p);
    this.room.state = 'battle';
    this.nextQuestion();
  }
  nextQuestion() {
    clearTimeout(this.timer);
    const q = this.bank.next();
    const order = shuffle([0, 1, 2, 3]);
    const options = order.map(i => q.options[i]);
    const answer = order.indexOf(q.answer);
    this.round++;
    this.current = { id: q.id, category: q.category, q: q.q, options, answer };
    const deadline = Date.now() + CONFIG.questionTimeMs;
    this.current.deadline = deadline;
    this.locked = new Set(); this.sentAt = Date.now();
    this.room.broadcast({
      type: 'question:new',
      question: { id: q.id, category: q.category, q: q.q, options, deadline, timeMs: CONFIG.questionTimeMs, round: this.round }
    });
    this.room.broadcast(this.actorState());
    this.timer = setTimeout(() => this.onTimeout(), CONFIG.questionTimeMs + 200);
  }
  answer(player, index) {
    if (this.room.state !== 'battle' || !this.current) return;
    if (this.locked.has(player.id)) return;
    if (Date.now() > this.current.deadline + 250) return;
    if (!Number.isInteger(index) || index < 0 || index > 3) return;
    if (index === this.current.answer) this.onCorrect(player, index);
    else this.onWrong(player, index);
  }
  computeDamage(attacker) {
    let dmg = CONFIG.baseDamage + Math.min(attacker.streak, CONFIG.streakCap) * CONFIG.streakBonus;
    let skillUsed = false;
    if (attacker.skillBuff) { dmg = Math.round(dmg * CONFIG.skill.multiplier); skillUsed = true; attacker.skillBuff = false; }
    return { dmg, skillUsed };
  }
  onCorrect(player, index) {
    clearTimeout(this.timer);
    const elapsed = Date.now() - this.sentAt;
    const { dmg: rawDmg, skillUsed } = this.computeDamage(player);

    const opp = [...this.room.players.values()].find(p => p.id !== player.id);
    let shielded = false, gated = false, dmg = rawDmg;
    if (opp.shields > 0) { opp.shields--; shielded = true; dmg = 0; }
    else {
      if (this.round < CONFIG.minQuestions && opp.hp - dmg < 1) { dmg = Math.max(0, opp.hp - 1); gated = true; }
      opp.hp = Math.max(0, opp.hp - dmg);
    }
    // streak / stats
    player.streak++; player.maxStreak = Math.max(player.maxStreak, player.streak);
    player.stats.correct++;
    if (player.stats.fastestMs == null || elapsed < player.stats.fastestMs) player.stats.fastestMs = elapsed;
    // energy (only while not on cooldown)
    if (Date.now() >= player.cooldownUntil)
      player.energy = Math.min(CONFIG.skill.energyMax, player.energy + CONFIG.skill.energyPerCorrect);
    // item cadence
    player.correctSince++;
    let granted = null;
    if (player.correctSince >= CONFIG.items.every) {
      player.correctSince = 0;
      granted = this.grantItem(player);
    }
    this.room.broadcast({
      type: 'answer:resolved', attackerId: player.id, index, correct: true,
      damage: dmg, rawDamage: rawDmg, shielded, gated, skillUsed,
      streaks: this.streakMap(), hps: this.hpMap(), elapsedMs: elapsed, granted
    });
    this.room.broadcast(this.actorState());
    this.timer = setTimeout(() => {
      if (!shielded && opp.hp <= 0 && this.round >= CONFIG.minQuestions) this.end(player.id);
      else this.nextQuestion();
    }, CONFIG.resolvePauseMs);
  }
  grantItem(player) {
    const def = ITEMS[crypto.randomInt(ITEMS.length)];
    if (def.id === 'shield') player.shields = Math.min(CONFIG.items.maxShields, player.shields + 1);
    else player.itemBag[def.id]++;
    return def.id;
  }
  onWrong(player, index) {
    this.locked.add(player.id);
    player.streak = 0; player.stats.wrong++;
    if (player.skillBuff) player.skillBuff = false; // armed buff is wasted on a miss
    this.room.broadcast({ type: 'answer:resolved', attackerId: player.id, index, correct: false, streaks: this.streakMap() });
    this.room.broadcast(this.actorState());
    const all = [...this.room.players.values()];
    if (all.every(p => this.locked.has(p.id))) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.nextQuestion(), CONFIG.wrongPauseMs);
    }
  }
  onTimeout() {
    for (const p of this.room.players.values()) { p.streak = 0; if (p.skillBuff) p.skillBuff = false; }
    this.room.broadcast({ type: 'question:timeout' });
    this.nextQuestion();
  }
  end(winnerId) {
    this.room.state = 'result'; clearTimeout(this.timer); this.current = null;
    const stats = {};
    for (const p of this.room.players.values())
      stats[p.id] = Object.assign({ maxStreak: p.maxStreak }, p.stats);
    this.room.broadcast({ type: 'match:end', winnerId, stats });
  }
  abort() { clearTimeout(this.timer); this.current = null; }

  hpMap() { const o = {}; for (const p of this.room.players.values()) o[p.id] = p.hp; return o; }
  streakMap() { const o = {}; for (const p of this.room.players.values()) o[p.id] = p.streak; return o; }
  actorState() {
    const now = Date.now();
    return {
      type: 'actor:state', round: this.round,
      players: [...this.room.players.values()].map(p => ({
        id: p.id, hp: p.hp, streak: p.streak, energy: p.energy, skillBuff: p.skillBuff,
        cooldownUntil: p.cooldownUntil, shields: p.shields,
        items: Object.assign({}, p.itemBag),
        skillReady: p.energy >= CONFIG.skill.energyMax && now >= p.cooldownUntil && !p.skillBuff
      }))
    };
  }
}

// ---------------- room ----------------
class ServerRoom {
  constructor(code) { this.code = code; this.players = new Map(); this.state = 'lobby'; this.match = null; this.seq = 0; this.grace = new Map(); }
  add(p) { this.players.set(p.id, p); this.broadcastLobby(); }
  broadcast(msg) {
    msg.room = this.code; msg.seq = ++this.seq; msg.ruleset_id = CONFIG.ruleset_id;
    const s = JSON.stringify(msg);
    for (const p of this.players.values()) if (p.res) { try { p.res.write('data: ' + s + '\n\n'); } catch (e) {} }
  }
  sendTo(player, msg) {
    msg.room = this.code; msg.ruleset_id = CONFIG.ruleset_id;
    if (player.res) { try { player.res.write('data: ' + JSON.stringify(msg) + '\n\n'); } catch (e) {} }
  }
  snapshot() {
    return {
      type: 'room:state', state: this.state, code: this.code,
      players: [...this.players.values()].map(p => ({
        id: p.id, name: p.name, char: p.char, ready: p.ready, connected: p.connected, isHost: p.isHost, hp: p.hp
      }))
    };
  }
  broadcastLobby() { this.broadcast(this.snapshot()); }
  startMatch() {
    this.match = new ServerMatch(this);
    this.broadcast({ type: 'match:start', players: this.snapshot().players });
    this.match.begin();
  }
  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    if (this.grace.has(id)) { clearTimeout(this.grace.get(id)); this.grace.delete(id); }
    if (p.hb) clearInterval(p.hb);
    if (p.res) { try { p.res.end(); } catch (e) {} }
    this.players.delete(id);
    if (this.state === 'battle' && this.match) { this.match.abort(); this.match = null; this.state = 'lobby'; }
    for (const r of this.players.values()) r.ready = false;
    this.broadcast({ type: 'player:left', name: p.name });
    if (this.players.size) this.broadcastLobby();
    if (this.players.size === 0) rooms.delete(this.code);
  }
}

// ---------------- HTTP ----------------
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(u.pathname);
  if (pathname === '/api/events') return handleSSE(req, res, u);
  if (pathname === '/api/room/create' && req.method === 'POST') return readBody(req, res, b => apiCreate(res, b));
  if (pathname === '/api/room/join' && req.method === 'POST') return readBody(req, res, b => apiJoin(res, b));
  if (pathname === '/api/action' && req.method === 'POST') return readBody(req, res, b => apiAction(res, b));
  if (pathname.startsWith('/api/')) { res.writeHead(404); return res.end('{"error":"not found"}'); }
  return serveStatic(res, pathname);
});
function readBody(req, res, cb) {
  let data = '';
  req.on('data', c => { data += c; if (data.length > 1e5) req.destroy(); });
  req.on('end', () => { let b = {}; try { b = data ? JSON.parse(data) : {}; } catch (e) { res.writeHead(400); return res.end('{"error":"bad json"}'); } cb(b); });
}
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); }
function auth(b) {
  const code = String(b.room || '').toUpperCase(), playerId = String(b.player || ''), token = String(b.token || '');
  const room = rooms.get(code), player = room && room.players.get(playerId);
  if (!room || !player || player.token !== token) return null;
  return { room, player };
}
function inviteUrls(code) {
  const list = [`http://localhost:${PORT}/?room=${code}`];
  for (const ip of lanIPs()) list.push(`http://${ip}:${PORT}/?room=${code}`);
  return list;
}
function apiCreate(res, b) {
  const name = cleanName(b.name), char = CHAR_IDS.has(b.char) ? b.char : CHARACTERS[0].id;
  let code; do { code = randCode(); } while (rooms.has(code));
  const room = new ServerRoom(code); rooms.set(code, room);
  room.add(makePlayer(name, char, true));
  json(res, 200, { ok: true, code, playerId: [...room.players.keys()][0], token: [...room.players.values()][0].token, inviteUrls: inviteUrls(code) });
}
function apiJoin(res, b) {
  const code = String(b.code || '').toUpperCase(), room = rooms.get(code);
  if (!room) return json(res, 404, { error: 'Room not found, please check the code.' });
  if (room.state !== 'lobby') return json(res, 409, { error: 'The match has already started.' });
  if (room.players.size >= 2) return json(res, 409, { error: 'Room is full.' });
  const p = makePlayer(cleanName(b.name), CHAR_IDS.has(b.char) ? b.char : CHARACTERS[1].id, false);
  room.add(p);
  json(res, 200, { ok: true, code, playerId: p.id, token: p.token, inviteUrls: inviteUrls(code) });
}
function apiAction(res, b) {
  const a = auth(b);
  if (!a) return json(res, 401, { error: 'Unauthorized or room expired.' });
  const { room, player } = a, payload = b.payload || {};
  switch (b.action) {
    case 'selectCharacter': {
      if (room.state !== 'lobby') return json(res, 409, { error: 'Cannot change character now.' });
      if (!CHAR_IDS.has(payload.char)) return json(res, 400, { error: 'Invalid character.' });
      player.char = payload.char; player.ready = false; room.broadcastLobby();
      return json(res, 200, { ok: true });
    }
    case 'ready': {
      if (room.state !== 'lobby') return json(res, 409, { error: 'Not in lobby.' });
      player.ready = !!payload.ready; room.broadcastLobby();
      return json(res, 200, { ok: true });
    }
    case 'start': {
      if (!player.isHost) return json(res, 403, { error: 'Only the host can start.' });
      if (room.state !== 'lobby') return json(res, 409, { error: 'Match already started.' });
      if (room.players.size !== 2) return json(res, 409, { error: 'Two players required.' });
      if (![...room.players.values()].every(p => p.ready)) return json(res, 409, { error: 'Both players must be ready.' });
      room.startMatch();
      return json(res, 200, { ok: true });
    }
    case 'answer': {
      if (room.state !== 'battle' || !room.match) return json(res, 409, { error: 'Not in a match.' });
      if (payload.questionId !== room.match.current?.id) return json(res, 200, { ok: true, stale: true });
      room.match.answer(player, payload.index | 0);
      return json(res, 200, { ok: true });
    }
    case 'useSkill': {
      if (room.state !== 'battle' || !room.match) return json(res, 409, { error: 'Not in a match.' });
      const now = Date.now();
      if (player.skillBuff) return json(res, 409, { error: 'Power Surge already armed.' });
      if (player.energy < CONFIG.skill.energyMax || now < player.cooldownUntil) return json(res, 409, { error: 'Skill not ready.' });
      player.skillBuff = true; player.energy = 0; player.cooldownUntil = now + CONFIG.skill.cooldownMs;
      room.broadcast(room.match.actorState());
      return json(res, 200, { ok: true });
    }
    case 'useItem': {
      if (room.state !== 'battle' || !room.match) return json(res, 409, { error: 'Not in a match.' });
      const id = String(payload.item);
      if (id === 'heal') {
        if (player.itemBag.heal <= 0) return json(res, 409, { error: 'No Repair Kit.' });
        player.itemBag.heal--; player.hp = Math.min(CONFIG.maxHp, player.hp + CONFIG.items.healAmount);
        room.broadcast(room.match.actorState());
        room.broadcast({ type: 'item:healed', by: player.id, hps: room.match.hpMap() });
        return json(res, 200, { ok: true });
      }
      if (id === 'insight') {
        if (player.itemBag.insight <= 0) return json(res, 409, { error: 'No Insight.' });
        const cur = room.match.current;
        if (!cur || room.match.locked.has(player.id)) return json(res, 409, { error: 'Cannot use Insight now.' });
        player.itemBag.insight--;
        const wrongs = [0, 1, 2, 3].filter(i => i !== cur.answer);
        const remove = shuffle(wrongs).slice(0, 2);
        room.sendTo(player, { type: 'insight:reveal', questionId: cur.id, remove });
        room.broadcast(room.match.actorState());
        return json(res, 200, { ok: true });
      }
      return json(res, 400, { error: 'Shield is automatic.' });
    }
    case 'emote': {
      const emoji = String(payload.emoji);
      if (!EMOJIS.includes(emoji)) return json(res, 400, { error: 'Unknown emoji.' });
      room.broadcast({ type: 'emote', from: player.id, emoji });
      return json(res, 200, { ok: true });
    }
    case 'rematch': {
      if (room.state !== 'result') return json(res, 409, { error: 'Cannot rematch now.' });
      player.ready = true; room.broadcastLobby();
      const ps = [...room.players.values()];
      if (ps.length === 2 && ps.every(p => p.ready)) { for (const p of ps) p.ready = false; room.startMatch(); }
      return json(res, 200, { ok: true });
    }
    case 'leave': room.removePlayer(player.id);
      return json(res, 200, { ok: true });
    default: return json(res, 400, { error: 'Unknown action.' });
  }
}

function handleSSE(req, res, u) {
  const code = String(u.searchParams.get('room') || '').toUpperCase();
  const playerId = String(u.searchParams.get('player') || ''), token = String(u.searchParams.get('token') || '');
  const room = rooms.get(code), player = room && room.players.get(playerId);
  if (!room || !player || player.token !== token) { res.writeHead(401); return res.end('unauthorized'); }
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write(':connected\n\n');
  player.res = res; player.connected = true;
  if (room.grace.has(playerId)) { clearTimeout(room.grace.get(playerId)); room.grace.delete(playerId); }
  if (player.hb) clearInterval(player.hb);
  player.hb = setInterval(() => { try { res.write(':hb\n\n'); } catch (e) {} }, 15000);
  res.write('data: ' + JSON.stringify(Object.assign(room.snapshot(), { ruleset_id: CONFIG.ruleset_id })) + '\n\n');
  if (room.state === 'battle' && room.match) {
    const c = room.match.current;
    if (c) res.write('data: ' + JSON.stringify({
      type: 'question:new', room: code, ruleset_id: CONFIG.ruleset_id,
      question: { id: c.id, category: c.category, q: c.q, options: c.options, deadline: c.deadline, timeMs: CONFIG.questionTimeMs, round: room.match.round }
    }) + '\n\n');
    res.write('data: ' + JSON.stringify(Object.assign(room.match.actorState(), { room: code })) + '\n\n');
  }
  req.on('close', () => {
    if (player.hb) clearInterval(player.hb);
    player.res = null; player.connected = false;
    if (room.players.has(playerId)) room.broadcastLobby();
    if (room.grace.has(playerId)) clearTimeout(room.grace.get(playerId));
    room.grace.set(playerId, setTimeout(() => room.removePlayer(playerId), 20000));
  });
}

function serveStatic(res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(PUBLIC, rel));
  if (!filePath.startsWith(PUBLIC)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404 Not Found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const ps = [...room.players.values()];
    if (ps.length && ps.every(p => !p.connected)) {
      room._deadSince = room._deadSince || now;
      if (now - room._deadSince > 60000) ps.forEach(p => room.removePlayer(p.id));
    } else room._deadSince = null;
  }
}, 20000);

server.listen(PORT, () => {
  console.log('Quiz Clash v2 running:');
  console.log('  local:  http://localhost:' + PORT);
  lanIPs().forEach(ip => console.log('  LAN:    http://' + ip + ':' + PORT));
});
