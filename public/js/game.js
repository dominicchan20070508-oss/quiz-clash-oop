// game.js — GameClient state machine + menu/lobby/battle/result + offline LocalMatch (v2)
(function () {
  const app = document.getElementById('app');
  let toastEl = document.getElementById('toast');
  if (!toastEl) {
    toastEl = document.createElement('div'); toastEl.id = 'toast'; toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  let toastTimer;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200); }
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function charById(id) { return CHARACTERS.find(c => c.id === id) || CHARACTERS[0]; }
  function itemById(id) { return ITEMS.find(i => i.id === id); }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function hpPct(hp) { return Math.max(0, Math.min(100, hp / QC_CONFIG.maxHp * 100)); }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); toast('Copied to clipboard'); }
    catch (e) { const i = document.createElement('textarea'); i.value = t; document.body.appendChild(i); i.select(); try { document.execCommand('copy'); toast('Copied'); } catch (_) { toast('Please copy manually'); } i.remove(); }
  }
  const prefillRoom = new URLSearchParams(location.search).get('room') || '';

  // unlock audio on first gesture
  document.addEventListener('pointerdown', function once() { QC_Audio.resume(); }, { once: true });

  // sound toggle
  const stBtn = document.getElementById('sound-toggle');
  function refreshSpk() {
    const m = QC_Audio.isMuted();
    document.getElementById('spk-on').style.display = m ? 'none' : 'block';
    document.getElementById('spk-off').style.display = m ? 'block' : 'none';
  }
  stBtn.onclick = () => { QC_Audio.setMuted(!QC_Audio.isMuted()); if (!QC_Audio.isMuted()) QC_Audio.resume(); refreshSpk(); };
  refreshSpk();

  /* ================= client ================= */
  class GameClient {
    constructor() {
      this.transport = null; this.creds = null; this.room = null;
      this.battle = null; this.lobbyEl = null; this.resultEl = null; this.localMatch = null;
      this.inviteUrls = []; this.selfChar = null;
      this.name = localStorage.getItem('qc_name') || '';
      this.char = localStorage.getItem('qc_char') || CHARACTERS[0].id;
    }
    saveProfile() { localStorage.setItem('qc_name', this.name); localStorage.setItem('qc_char', this.char); }
    start() { this.renderMenu(); }

    // ---------- menu ----------
    renderMenu() {
      this.destroyBattle();
      if (this.localMatch) { this.localMatch.destroy(); this.localMatch = null; }
      if (this.transport) { this.transport.close(); this.transport = null; }
      QC_Audio.stopMusic();
      this.creds = null; this.room = null;
      app.innerHTML = '';
      const s = el('div', 'screen menu');
      const card = el('div', 'menu-card');
      card.innerHTML =
        '<div class="logo"><h1>QUIZ CLASH · OOP BATTLE</h1><p>Fast 1v1 OOP quiz — answer correctly first to attack and drain the rival HP!</p></div>'
        + '<div class="menu-row"><input class="field" id="f-name" placeholder="Enter your nickname" maxlength="12" /></div>'
        + '<div class="section-title">Choose your fighter (equal damage, different effects &amp; skills)</div>'
        + '<div class="char-grid" id="char-grid"></div>'
        + '<div class="menu-actions">'
        + '<button class="btn" id="b-create">Create Room</button>'
        + '<div class="join-inline"><input class="field" id="f-code" placeholder="Room code" maxlength="6" /><button class="btn ghost" id="b-join">Join</button></div>'
        + '<button class="btn good" id="b-practice">Practice vs AI</button>'
        + '</div>'
        + '<div class="hint">Share the room code, invite link or QR code with a friend. Questions are in English (OOP).</div>';
      s.appendChild(card); app.appendChild(s);

      const nameI = card.querySelector('#f-name'); nameI.value = this.name;
      const grid = card.querySelector('#char-grid');
      const cards = [];
      CHARACTERS.forEach(c => {
        const cc = el('div', 'char-card');
        cc.style.setProperty('--cc', c.color);
        cc.innerHTML = '<div class="preview">' + QC_charSVG(c) + '</div><div class="cname">' + c.name + '</div><div class="ctitle">' + c.title + '</div><div class="cskill">' + c.skillName + '</div>';
        const svg = cc.querySelector('svg'); svg.setAttribute('viewBox', '0 0 200 260'); svg.style.height = '96px'; svg.style.width = 'auto';
        cc.onclick = () => { this.char = c.id; cards.forEach(x => x.classList.toggle('sel', x === cc)); QC_Audio.play('click'); };
        grid.appendChild(cc); cards.push(cc);
      });
      cards.forEach((x, i) => x.classList.toggle('sel', CHARACTERS[i].id === this.char));
      const codeI = card.querySelector('#f-code'); if (prefillRoom) codeI.value = prefillRoom;

      const read = () => { this.name = nameI.value.trim() || ('Player' + Math.floor(Math.random() * 900 + 100)); this.saveProfile(); };
      card.querySelector('#b-create').onclick = () => { read(); this.doCreate(); };
      card.querySelector('#b-join').onclick = () => { read(); const code = codeI.value.trim(); if (!code) return toast('Enter a room code'); this.doJoin(code); };
      card.querySelector('#b-practice').onclick = () => { read(); this.doPractice(this.name, this.char); };
    }

    // ---------- create / join ----------
    async doCreate() {
      try {
        const t = new Transport();
        const d = await t.createRoom(this.name, this.char);
        this.transport = t; this.creds = { code: d.code, playerId: d.playerId, token: d.token };
        this.inviteUrls = d.inviteUrls;
        t.onMessage(m => this.handleServer(m));
        t.connect(this.creds);
        this.renderLobby();
      } catch (e) { toast(e.message); }
    }
    async doJoin(code) {
      try {
        const t = new Transport();
        const d = await t.joinRoom(code, this.name, this.char);
        this.transport = t; this.creds = { code: d.code, playerId: d.playerId, token: d.token };
        this.inviteUrls = d.inviteUrls;
        t.onMessage(m => this.handleServer(m));
        t.connect(this.creds);
        this.renderLobby();
      } catch (e) { toast(e.message); }
    }

    // ---------- lobby ----------
    renderLobby() {
      if (this.resultEl) { this.resultEl.remove(); this.resultEl = null; }
      if (this.lobbyEl) this.lobbyEl.remove();
      const lb = el('div', 'screen lobby');
      const card = el('div', 'lobby-card');
      card.innerHTML =
        '<div class="code-box"><div class="code" id="lb-code">------</div><p>Send the code, link or QR code to your teammate</p></div>'
        + '<div class="qr-grid"><div class="qr-box" id="lb-qr"></div>'
        + '<div class="qr-note">Scan with a phone camera on the same Wi-Fi to open and join instantly.<br><br>Or open the invite link below on any device.</div></div>'
        + '<div class="invite-row"><input class="field" id="lb-link" readonly /><button class="btn ghost" id="lb-copy">Copy invite</button></div>'
        + '<div class="section-title" style="text-align:center">Players</div>'
        + '<div class="players2" id="lb-slots"></div>'
        + '<div class="section-title" style="text-align:center">Change fighter (before start)</div>'
        + '<div class="char-grid" id="lb-chars" style="grid-template-columns:repeat(5,1fr)"></div>'
        + '<div class="lobby-actions" style="margin-top:18px">'
        + '<button class="btn ghost" id="lb-ready">Ready</button>'
        + '<button class="btn" id="lb-start">Start</button>'
        + '<button class="btn ghost" id="lb-leave">Leave</button>'
        + '</div>';
      lb.appendChild(card); app.innerHTML = ''; app.appendChild(lb);
      this.lobbyEl = lb;

      this.renderQR(lb.querySelector('#lb-qr'));
      const lan = this.inviteUrls.filter(u => !u.includes('localhost'));
      lb.querySelector('#lb-link').value = (lan[0] || this.inviteUrls[0] || '');
      lb.querySelector('#lb-copy').onclick = () => copyText(lb.querySelector('#lb-link').value);
      lb.querySelector('#lb-leave').onclick = () => this.leaveRoom();
      lb.querySelector('#lb-ready').onclick = () => {
        const cur = this.room && this.room.players.find(p => p.id === this.creds.playerId);
        this.transport.send('ready', { ready: !(cur && cur.ready) });
      };
      lb.querySelector('#lb-start').onclick = () => this.transport.send('start', {});

      const cg = lb.querySelector('#lb-chars');
      CHARACTERS.forEach(c => {
        const b = el('button', 'char-card'); b.type = 'button'; b.style.setProperty('--cc', c.color);
        b.innerHTML = '<div class="preview">' + QC_charSVG(c) + '</div><div class="cname" style="font-size:12px">' + c.name + '</div>';
        b.querySelector('svg').style.height = '70px'; b.querySelector('svg').style.width = 'auto';
        b.onclick = () => { this.transport.send('selectCharacter', { char: c.id }); QC_Audio.play('click'); };
        cg.appendChild(b);
      });
      if (this.room) this.updateLobby(this.room);
    }
    renderQR(box) {
      try {
        const lan = this.inviteUrls.filter(u => !u.includes('localhost'));
        const text = lan[0] || this.inviteUrls[0] || location.origin;
        const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
        const n = qr.getModuleCount(), size = 158, cell = Math.floor(size / n);
        const cv = document.createElement('canvas'); cv.width = cv.height = cell * n;
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
        cx.fillStyle = '#101528';
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) cx.fillRect(c * cell, r * cell, cell, cell);
        box.appendChild(cv);
      } catch (e) { box.textContent = 'QR unavailable'; }
    }
    updateLobby(state) {
      this.room = state;
      if (!this.lobbyEl) return;
      this.lobbyEl.querySelector('#lb-code').textContent = state.code;
      const slots = this.lobbyEl.querySelector('#lb-slots'); slots.innerHTML = '';
      const ordered = state.players.slice().sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0));
      [0, 1].forEach(i => {
        const p = ordered[i];
        const slot = el('div', 'slot' + (p ? ' filled' : ''));
        if (p) {
          const c = charById(p.char);
          slot.innerHTML = '<div class="avatar">' + QC_charSVG(c) + '</div><div class="pname">' + p.name + (p.isHost ? ' (host)' : '') + '</div>'
            + '<div class="pmeta">' + c.title + ' · ' + c.name + ' · ' + c.attackName + '</div>';
          const badge = !p.connected ? '<span class="badge off">offline</span>'
            : p.ready ? '<span class="badge ready">ready</span>' : '<span class="badge wait">not ready</span>';
          slot.insertAdjacentHTML('beforeend', badge);
          const svg = slot.querySelector('svg'); svg.style.height = '96px'; svg.style.width = 'auto';
        } else slot.innerHTML = '<div class="pmeta">Waiting for a teammate…</div>';
        slots.appendChild(slot);
      });
      const me = state.players.find(p => p.id === this.creds.playerId);
      const readyBtn = this.lobbyEl.querySelector('#lb-ready');
      readyBtn.textContent = me && me.ready ? 'Cancel ready' : 'Ready';
      const startBtn = this.lobbyEl.querySelector('#lb-start');
      startBtn.disabled = !(me && me.isHost && state.players.length === 2 && state.players.every(p => p.ready));
      this.lobbyEl.querySelectorAll('#lb-chars .char-card').forEach((b, i) => b.classList.toggle('sel', me && CHARACTERS[i].id === me.char));
    }

    // ---------- battle ----------
    startBattle(players) {
      if (this.lobbyEl) { this.lobbyEl.remove(); this.lobbyEl = null; }
      if (this.resultEl) { this.resultEl.remove(); this.resultEl = null; }
      this.destroyBattle();
      const selfId = this.creds ? this.creds.playerId : 'you';
      const me = players.find(p => p.id === selfId); this.selfChar = me ? me.char : this.char;
      this.battle = new BattleScreen(app, {
        players, selfId,
        onAnswer: (idx) => { if (this.creds) this.transport.send('answer', { questionId: this.battle.questionId, index: idx }); else this.localMatch.localAnswer(idx); },
        onSkill: () => { if (this.creds) this.transport.send('useSkill', {}); else this.localMatch.localSkill(); },
        onItem: (id) => { if (this.creds) this.transport.send('useItem', { item: id }); else this.localMatch.localItem(id); },
        onEmote: (e) => { if (this.creds) this.transport.send('emote', { emoji: e }); else this.localMatch.localEmote(e); },
        onEnd: (e) => this.showResult(e),
        onLeave: () => { if (this.creds) this.leaveRoom(); else { this.localMatch.destroy(); this.renderMenu(); } }
      });
      QC_Audio.startMusic();
    }

    // ---------- result ----------
    showResult(e) {
      QC_Audio.stopMusic();
      this.destroyBattle();
      const selfId = this.creds ? this.creds.playerId : 'you';
      const win = e.winnerId === selfId;
      const st = (e.stats && e.stats[selfId]) || { correct: 0, wrong: 0, fastestMs: null, maxStreak: 0 };
      const total = st.correct + st.wrong, acc = total ? Math.round(st.correct / total * 100) : 0;
      const c = charById(this.selfChar);
      if (this.resultEl) this.resultEl.remove();
      const r = el('div', 'screen result ' + (win ? 'win' : 'lose'));
      r.innerHTML =
        '<div class="veil"></div><div class="rays"></div><div class="cracks"></div>'
        + '<div class="result-card">'
        + '<div class="win-fighter">' + QC_charSVG(c) + '</div>'
        + '<div class="big">' + (win ? 'VICTORY' : 'DEFEAT') + '</div>'
        + '<div class="sub">' + (win ? 'You defeated your rival with ' + c.attackName + '!' : 'Good game — win the next one!') + '</div>'
        + '<div class="stat-grid">'
        + '<div class="stat"><div class="v">' + st.correct + '</div><div class="k">Correct</div></div>'
        + '<div class="stat"><div class="v">' + acc + '%</div><div class="k">Accuracy</div></div>'
        + '<div class="stat"><div class="v">' + (st.maxStreak || 0) + '</div><div class="k">Best streak</div></div>'
        + '</div>'
        + '<div class="result-actions"><button class="btn good" id="r-rematch">Rematch</button><button class="btn ghost" id="r-back">Back to menu</button></div>'
        + '<div class="wait-note" id="r-note"></div>'
        + '</div>';
      const wf = r.querySelector('.win-fighter svg'); wf.style.height = '180px'; wf.style.width = 'auto';
      app.innerHTML = ''; app.appendChild(r); this.resultEl = r;

      if (win) {
        const colors = ['#ffd23f', '#ff8a3d', '#7fd8ff', '#9b8cff', '#34d399'];
        for (let i = 0; i < 90; i++) { const p = el('div', 'confetti'); p.style.left = Math.random() * 100 + '%'; p.style.background = colors[Math.floor(Math.random() * colors.length)]; p.style.animationDuration = (2.2 + Math.random() * 2.4) + 's'; p.style.animationDelay = (Math.random() * 1.5) + 's'; r.appendChild(p); }
      } else {
        for (let i = 0; i < 44; i++) { const p = el('div', 'ember'); p.style.left = Math.random() * 100 + '%'; p.style.animationDuration = (2.6 + Math.random() * 3) + 's'; p.style.animationDelay = (Math.random() * 2) + 's'; r.appendChild(p); }
      }
      QC_Audio.play(win ? 'victory' : 'defeat');

      r.querySelector('#r-rematch').onclick = () => {
        if (this.creds) { this.transport.send('rematch', {}); r.querySelector('#r-note').textContent = 'Waiting for the opponent to accept…'; r.querySelector('#r-rematch').disabled = true; }
        else this.restartPractice();
      };
      r.querySelector('#r-back').onclick = () => this.leaveRoom();
    }
    restartPractice() { if (this.resultEl) { this.resultEl.remove(); this.resultEl = null; } this.doPractice(this.name || 'You', this.char); }

    // ---------- practice ----------
    doPractice(name, char) {
      this.saveProfile();
      const aiChar = CHARACTERS.filter(c => c.id !== char)[Math.floor(Math.random() * 4)].id;
      const players = [
        { id: 'you', name, char, ready: true, connected: true, isHost: true, hp: QC_CONFIG.maxHp },
        { id: 'ai', name: 'AI Rival', char: aiChar, ready: true, connected: true, isHost: false, hp: QC_CONFIG.maxHp }
      ];
      this.startBattle(players);
      this.localMatch = new LocalMatch(this.battle, players);
      this.localMatch.begin();
    }

    // ---------- server events ----------
    handleServer(m) {
      switch (m.type) {
        case 'room:state':
          if (this.lobbyEl) this.updateLobby(m);
          if (this.resultEl) {
            const other = m.players.find(p => p.id !== this.creds.playerId);
            if (other && other.ready) this.resultEl.querySelector('#r-note').textContent = 'Opponent is ready, starting…';
          }
          break;
        case 'match:start': this.startBattle(m.players); break;
        case 'question:new': if (this.battle) this.battle.onNew(m.question); break;
        case 'actor:state': if (this.battle) this.battle.onActorState(m); break;
        case 'answer:resolved': if (this.battle) this.battle.onResolved(m); break;
        case 'insight:reveal': if (this.battle) this.battle.onInsight(m); break;
        case 'item:healed': if (this.battle) this.battle.onHealed(m); break;
        case 'emote': if (this.battle) this.battle.showEmote(m.from, m.emoji); break;
        case 'question:timeout': if (this.battle) this.battle.onTimeout(); break;
        case 'match:end': if (this.battle) this.battle.handleEnd(m); break;
        case 'player:left':
          toast((m.name || 'Player') + ' left');
          this.destroyBattle();
          if (this.resultEl) { this.resultEl.remove(); this.resultEl = null; }
          this.room = null; this.renderLobby();
          break;
      }
    }

    destroyBattle() { if (this.battle) { this.battle.destroy(); this.battle = null; } }
    leaveRoom() {
      if (this.transport) { const t = this.transport; this.transport = null; t.send('leave', {}).catch(() => {}); setTimeout(() => t.close(), 200); }
      if (this.localMatch) { this.localMatch.destroy(); this.localMatch = null; }
      QC_Audio.stopMusic();
      this.destroyBattle(); this.renderMenu();
    }
  }

  /* ================= battle screen ================= */
  class BattleScreen {
    constructor(mount, opt) {
      this.opt = opt; this.selfId = opt.selfId;
      this.playersArr = opt.players.slice();
      this.left = this.playersArr.find(p => p.isHost) || this.playersArr[0];
      this.right = this.playersArr.find(p => p.id !== this.left.id);
      this.answered = false; this.questionId = null; this.round = 0;
      this.timers = []; this.pendingImpact = false; this.rtSelf = null; this.lastTickSec = 99;
      this.build(mount);
    }
    later(fn, ms) { const t = setTimeout(fn, ms); this.timers.push(t); return t; }
    sideOf(id) { return id === this.left.id ? 'left' : 'right'; }
    build(mount) {
      this.screen = el('div', 'screen battle');
      const hud = el('div', 'hud');
      hud.appendChild(this.makeHud(this.left));
      hud.appendChild(el('div', 'vs', 'VS<small id="hud-round">Q1</small>'));
      hud.appendChild(this.makeHud(this.right));

      this.stage = el('div', 'stage');
      this.cv = el('canvas', 'fx-canvas'); this.stage.appendChild(this.cv);
      this.fighters = {};
      this.fighters[this.left.id] = new Fighter(this.stage, this.left.char, 'left', this.left.name);
      this.fighters[this.right.id] = new Fighter(this.stage, this.right.char, 'right', this.right.name);
      this.qwrap = el('div', 'question-wrap');
      this.qwrap.innerHTML =
        '<div class="q-card"><span class="tag" id="q-cat">Category</span>'
        + '<div class="qtext" id="q-text">Loading question…</div>'
        + '<div class="timer"><div class="tfill" id="t-fill"></div></div>'
        + '<div class="q-state" id="q-state"></div></div>';
      this.stage.appendChild(this.qwrap);

      // action tray (personal)
      this.tray = el('div', 'tray');
      const g1 = el('div', 'tray-group');
      this.skillBtn = el('button', 'skill-btn'); this.skillBtn.type = 'button';
      this.skillBtn.innerHTML = '<span class="sg">✦</span><span class="slabel">Power Surge</span>';
      this.skillBtn.onclick = () => { this.opt.onSkill(); };
      this.roundPill = el('span', 'round-pill', 'Q1');
      g1.appendChild(this.skillBtn); g1.appendChild(this.roundPill);
      const g2 = el('div', 'tray-group');
      this.itemBtns = {};
      ['insight', 'heal'].forEach(id => {
        const def = itemById(id), b = el('button', 'item-btn'); b.type = 'button'; b.disabled = true;
        b.innerHTML = def.glyph + '<span class="cnt">0</span>';
        b.onclick = () => { this.opt.onItem(id); };
        g2.appendChild(b); this.itemBtns[id] = b;
      });
      this.emojiBtn = el('button', 'emoji-btn'); this.emojiBtn.type = 'button'; this.emojiBtn.textContent = '🙂';
      this.emojiBtn.onclick = (e) => { e.stopPropagation(); this.panel.classList.toggle('show'); };
      g2.appendChild(this.emojiBtn);
      this.tray.appendChild(g1); this.tray.appendChild(g2);
      this.panel = el('div', 'emoji-panel');
      EMOJIS.forEach(em => { const b = el('button'); b.type = 'button'; b.textContent = em; b.onclick = (e) => { e.stopPropagation(); this.opt.onEmote(em); this.panel.classList.remove('show'); }; this.panel.appendChild(b); });
      document.addEventListener('pointerdown', this.docClose = (e) => { if (!this.panel.contains(e.target)) this.panel.classList.remove('show'); });

      this.optsWrap = el('div', 'options');
      this.optEls = [];
      ['A', 'B', 'C', 'D'].forEach((k, i) => {
        const b = el('button', 'opt'); b.type = 'button';
        b.innerHTML = '<span class="key">' + k + '</span><span class="oval"></span>';
        b.onclick = () => this.choose(i);
        this.optsWrap.appendChild(b); this.optEls.push(b);
      });

      const leave = el('button', 'btn small ghost corner-leave'); leave.type = 'button'; leave.textContent = 'Leave';
      leave.onclick = () => this.opt.onLeave();

      this.screen.appendChild(leave); this.screen.appendChild(hud); this.screen.appendChild(this.stage);
      this.screen.appendChild(this.tray); this.screen.appendChild(this.panel); this.screen.appendChild(this.optsWrap);
      mount.innerHTML = ''; mount.appendChild(this.screen);
      this.effects = new Effects(this.cv);

      this.keyHandler = (e) => {
        const map = { '1': 0, '2': 1, '3': 2, '4': 3 };
        if (e.key in map) this.choose(map[e.key]);
      };
      window.addEventListener('keydown', this.keyHandler);

      this.uiRaf = requestAnimationFrame(() => this.uiLoop());
    }
    makeHud(p) {
      const c = charById(p.char);
      const sideEl = el('div', 'hud-side ' + this.sideOf(p.id));
      const av = el('div', 'hud-avatar'); av.innerHTML = QC_charSVG(c);
      const svg = av.querySelector('svg'); svg.style.height = '100%'; svg.style.width = 'auto';
      const info = el('div', 'hud-info');
      info.innerHTML = '<div class="hud-line"><span class="mid"><span class="nm">' + p.name + '</span>'
        + '<span class="streak-badge" style="display:none"></span><span class="shields-mini"></span></span>'
        + '<span class="hpnum"></span></div>'
        + '<div class="hpbar"><div class="hpfill"></div></div>'
        + '<div class="energy"><div class="efill"></div></div>';
      sideEl.appendChild(av); sideEl.appendChild(info);
      this.hud = this.hud || {};
      this.hud[p.id] = {
        fill: info.querySelector('.hpfill'), num: info.querySelector('.hpnum'), bar: info.querySelector('.hpbar'),
        efill: info.querySelector('.efill'), streakEl: info.querySelector('.streak-badge'), shieldEl: info.querySelector('.shields-mini')
      };
      this.setHp(p.id, p.hp);
      return sideEl;
    }
    setHp(id, hp) {
      const h = this.hud[id]; if (!h) return;
      h.fill.style.width = hpPct(hp) + '%'; h.num.textContent = hp + ' / ' + QC_CONFIG.maxHp;
      h.bar.classList.toggle('low', hpPct(hp) <= 28);
    }
    uiLoop() {
      // timer bar
      if (this.deadline) {
        const k = Math.max(0, Math.min(1, (this.deadline - Date.now()) / this.timeMs));
        this.tfill.style.width = (k * 100) + '%';
        const sec = Math.ceil((this.deadline - Date.now()) / 1000);
        if (sec <= 3 && sec >= 1 && sec !== this.lastTickSec) { this.lastTickSec = sec; QC_Audio.play('tick'); }
      }
      this.updateSkillBtn();
      this.uiRaf = requestAnimationFrame(() => this.uiLoop());
    }
    updateSkillBtn() {
      const rt = this.rtSelf; if (!rt) return;
      const now = Date.now();
      this.skillBtn.classList.toggle('armed', !!rt.skillBuff);
      const cdLeft = rt.cooldownUntil - now;
      let cd = this.skillBtn.querySelector('.cd');
      if (rt.skillBuff) { this.skillBtn.classList.remove('ready'); this.skillBtn.disabled = true; if (cd) cd.remove(); }
      else if (rt.energy >= QC_CONFIG.skill.energyMax && cdLeft <= 0) {
        this.skillBtn.classList.add('ready'); this.skillBtn.disabled = false; if (cd) cd.remove();
      } else {
        this.skillBtn.classList.remove('ready'); this.skillBtn.disabled = true;
        if (cdLeft > 0) { if (!cd) { cd = el('span', 'cd'); this.skillBtn.appendChild(cd); } cd.textContent = Math.ceil(cdLeft / 1000) + 's'; }
        else if (cd) cd.remove();
      }
    }

    onNew(q) {
      this.questionId = q.id; this.answered = false; this.deadline = q.deadline; this.timeMs = q.timeMs; this.lastTickSec = 99;
      this.round = q.round || this.round + 1;
      Object.values(this.fighters).forEach(f => f.state('idle'));
      this.qwrap.querySelector('#q-cat').textContent = q.category;
      this.qwrap.querySelector('#q-text').textContent = q.q;
      this.stateMsg('', '');
      this.optEls.forEach((b, i) => {
        b.className = 'opt'; b.disabled = false;
        b.querySelector('.oval').textContent = q.options[i];
      });
      const rr = this.screen.querySelector('#hud-round'); if (rr) rr.textContent = 'Q' + this.round;
      this.roundPill.textContent = 'Q' + this.round;
      this.tfill = this.qwrap.querySelector('#t-fill'); this.tfill.style.width = '100%';
    }
    choose(i) {
      if (this.answered || !this.questionId) return;
      this.answered = true;
      this.opt.onAnswer(i);
    }
    onActorState(m) {
      for (const st of m.players) {
        const h = this.hud[st.id];
        if (h) {
          h.efill.style.width = st.energy + '%';
          if (st.streak >= 2) { h.streakEl.style.display = 'inline-flex'; h.streakEl.textContent = '🔥' + st.streak; }
          else h.streakEl.style.display = 'none';
          h.shieldEl.textContent = st.shields > 0 ? '🛡️'.repeat(st.shields) : '';
        }
        const bI = this.itemBtns.insight, bH = this.itemBtns.heal;
        if (st.id === this.selfId) {
          this.rtSelf = st;
          bI.querySelector('.cnt').textContent = st.items.insight; bI.disabled = st.items.insight <= 0 || this.answered;
          bH.querySelector('.cnt').textContent = st.items.heal; bH.disabled = st.items.heal <= 0;
        }
        if (!this.pendingImpact) this.setHp(st.id, st.hp);
      }
    }
    onResolved(m) {
      if (m.correct) {
        this.pendingImpact = true;
        const atkF = this.fighters[m.attackerId], atkC = charById(atkF.char);
        const defId = this.playersArr.find(p => p.id !== m.attackerId).id;
        const defF = this.fighters[defId];
        atkF.state('attack');
        this.effects.launch(atkF, defF);
        this.optEls.forEach(b => { b.classList.remove('correct', 'wrong'); b.disabled = true; });
        this.optEls[m.index].classList.add('correct');
        const me = m.attackerId === this.selfId;
        if (me) { QC_Audio.play('correct'); this.banner('Correct!', 'good'); this.stateMsg('Correct — ' + atkC.attackName + '!', 'good'); }
        else { this.banner('Incoming!', 'bad'); this.stateMsg('Rival answered correctly!', 'bad'); }
        if (me && m.granted) QC_Audio.play('item');
        const travel = QC_TRAVEL[atkC.effect];
        this.later(() => {
          this.pendingImpact = false;
          if (m.shielded) { this.banner('Blocked!', 'neutral'); QC_Audio.play('shield'); this.applyHp(m.hps); }
          else { defF.state('hit'); this.applyHp(m.hps); this.damageFloat(defId, m.damage); QC_Audio.play('hit', atkC.effect); }
        }, travel);
        this.later(() => atkF.state('idle'), 620);
      } else {
        this.optEls[m.index].classList.add('wrong');
        if (m.attackerId === this.selfId) {
          this.answered = true; this.optEls.forEach(b => b.disabled = true);
          this.banner('Incorrect!', 'bad'); QC_Audio.play('wrong');
          this.stateMsg('Incorrect — you are locked out this question.', 'bad');
          this.setItemDisabled();
        } else {
          this.stateMsg('Rival missed — answer now!', 'good');
          if (!this.answered) this.optEls.forEach(b => b.disabled = false);
        }
      }
    }
    currentHp(id) { const h = this.hud[id]; return h ? parseInt(h.num.textContent) : QC_CONFIG.maxHp; }
    setItemDisabled() {
      const st = this.rtSelf;
      if (this.itemBtns.insight) this.itemBtns.insight.disabled = true;
    }
    onInsight(m) {
      if (m.questionId !== this.questionId) return;
      m.remove.forEach(i => this.optEls[i].classList.add('eliminated'));
      QC_Audio.play('item');
    }
    onHealed(m) {
      this.pendingImpact = false;
      if (m.hps) this.applyHp(m.hps);
      const hf = this.fighters[m.by]; if (hf) this.healFloat(m.by, QC_CONFIG.items.healAmount);
      QC_Audio.play('heal');
    }
    onTimeout() {
      this.banner("Time's up!", 'neutral');
      this.stateMsg('No one answered — no attack.', 'info');
      this.optEls.forEach(b => b.disabled = true);
    }
    showEmote(fromId, emoji) {
      const b = el('div', 'emote-bubble ' + this.sideOf(fromId)); b.textContent = emoji;
      document.getElementById('emote-layer').appendChild(b);
      setTimeout(() => b.remove(), 1850);
    }
    handleEnd(m) {
      this.deadline = null;
      this.optEls.forEach(b => b.disabled = true);
      const loseId = this.playersArr.find(p => p.id !== m.winnerId).id;
      this.fighters[m.winnerId].state('victory'); this.fighters[loseId].state('defeat');
      this.stateMsg('K.O.!', 'good');
      this.later(() => this.opt.onEnd(m), 1500);
    }
    applyHp(hps) { if (hps) for (const id in hps) this.setHp(id, hps[id]); }
    damageFloat(pid, dmg) {
      const chest = this.fighters[pid].chest(), sr = this.stage.getBoundingClientRect();
      const d = el('div', 'dmg-float'); d.textContent = '-' + dmg;
      d.style.left = (chest.x - sr.x - 18) + 'px'; d.style.top = (chest.y - sr.y - 34) + 'px';
      this.stage.appendChild(d); this.later(() => d.remove(), 1100);
    }
    healFloat(pid, amt) {
      const chest = this.fighters[pid].chest(), sr = this.stage.getBoundingClientRect();
      const d = el('div', 'dmg-float heal'); d.textContent = '+' + amt;
      d.style.left = (chest.x - sr.x - 18) + 'px'; d.style.top = (chest.y - sr.y - 34) + 'px';
      this.stage.appendChild(d); this.later(() => d.remove(), 1100);
    }
    banner(text, c) {
      const b = el('div', 'fb-banner ' + c); b.textContent = text;
      this.stage.appendChild(b); setTimeout(() => b.remove(), 1400);
    }
    stateMsg(t, c) { const s = this.qwrap.querySelector('#q-state'); s.textContent = t; s.className = 'q-state ' + (c || ''); }
    destroy() {
      cancelAnimationFrame(this.uiRaf);
      this.timers.forEach(t => clearTimeout(t));
      window.removeEventListener('keydown', this.keyHandler);
      document.removeEventListener('pointerdown', this.docClose);
      this.screen.remove();
    }
  }

  /* ================= offline match (mirrors server authority) ================= */
  function newRuntime() {
    return {
      hp: QC_CONFIG.maxHp, streak: 0, maxStreak: 0, energy: 0, skillBuff: false, cooldownUntil: 0,
      shields: 0, itemBag: { insight: 0, heal: 0 }, correctSince: 0,
      stats: { correct: 0, wrong: 0, fastestMs: null }
    };
  }
  class LocalMatch {
    constructor(battle, players) {
      this.battle = battle;
      this.ids = players.map(p => p.id);
      this.rt = {}; players.forEach(p => (this.rt[p.id] = newRuntime()));
      this.current = null; this.locked = new Set(); this.sentAt = 0; this.last = null; this.deck = null;
      this.timer = null; this.aiTimer = null; this.round = 0;
    }
    drawQuestion() {
      if (!this.deck || this.deck.length === 0) this.deck = shuffle(QUESTIONS);
      let idx = this.deck.length - 1;
      if (this.deck[idx].id === this.last) idx = Math.floor(Math.random() * this.deck.length);
      const [q] = this.deck.splice(idx, 1); this.last = q.id;
      const order = shuffle([0, 1, 2, 3]);
      return { id: q.id, category: q.category, q: q.q, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer) };
    }
    begin() { this.nextQuestion(); }
    clearTimers() { clearTimeout(this.timer); clearTimeout(this.aiTimer); }
    nextQuestion() {
      this.clearTimers();
      const q = this.drawQuestion(); const deadline = Date.now() + QC_CONFIG.questionTimeMs;
      this.current = Object.assign(q, { deadline }); this.locked = new Set(); this.sentAt = Date.now(); this.round++;
      this.battle.onNew({ id: q.id, category: q.category, q: q.q, options: q.options, deadline, timeMs: QC_CONFIG.questionTimeMs, round: this.round });
      this.pushState();
      // occasional AI emote
      if (Math.random() < 0.16) this.localEmote(EMOJIS[Math.floor(Math.random() * EMOJIS.length)], true);
      const delay = QC_CONFIG.ai.minDelayMs + Math.random() * (QC_CONFIG.ai.maxDelayMs - QC_CONFIG.ai.minDelayMs);
      this.aiTimer = setTimeout(() => {
        if (!this.current || this.locked.has('ai')) return;
        const ai = this.rt.ai;
        if (ai.energy >= QC_CONFIG.skill.energyMax && Date.now() >= ai.cooldownUntil && Math.random() < 0.6) this.arm('ai');
        if (ai.hp < 90 && ai.itemBag.heal > 0 && Math.random() < 0.5) this.useItem('ai', 'heal');
        let idx;
        if (Math.random() < QC_CONFIG.ai.accuracy) idx = this.current.answer;
        else idx = [0, 1, 2, 3].filter(i => i !== this.current.answer)[Math.floor(Math.random() * 3)];
        this.answer('ai', idx);
      }, delay);
      this.timer = setTimeout(() => { this.battle.onTimeout(); this.timer = setTimeout(() => this.nextQuestion(), 750); }, QC_CONFIG.questionTimeMs + 100);
    }
    localAnswer(idx) { this.answer('you', idx); }
    answer(pid, index) {
      if (!this.current || this.locked.has(pid)) return;
      if (Date.now() > this.current.deadline + 150) return;
      if (index === this.current.answer) this.correct(pid, index); else this.wrong(pid, index);
    }
    other(pid) { return pid === 'you' ? 'ai' : 'you'; }
    hps() { return { you: this.rt.you.hp, ai: this.rt.ai.hp }; }
    streaks() { return { you: this.rt.you.streak, ai: this.rt.ai.streak }; }
    computeDamage(a) {
      let dmg = QC_CONFIG.baseDamage + Math.min(a.streak, QC_CONFIG.streakCap) * QC_CONFIG.streakBonus, skillUsed = false;
      if (a.skillBuff) { dmg = Math.round(dmg * QC_CONFIG.skill.multiplier); skillUsed = true; a.skillBuff = false; }
      return { dmg, skillUsed };
    }
    correct(pid, index) {
      this.clearTimers();
      const a = this.rt[pid], d = this.rt[this.other(pid)];
      const elapsed = Date.now() - this.sentAt;
      const { dmg: rawDmg, skillUsed } = this.computeDamage(a);
      let shielded = false, dmg = rawDmg;
      if (d.shields > 0) { d.shields--; shielded = true; dmg = 0; }
      else {
        if (this.round < QC_CONFIG.minQuestions && d.hp - dmg < 1) dmg = Math.max(0, d.hp - 1);
        d.hp = Math.max(0, d.hp - dmg);
      }
      a.streak++; a.maxStreak = Math.max(a.maxStreak, a.streak);
      a.stats.correct++; if (a.stats.fastestMs == null || elapsed < a.stats.fastestMs) a.stats.fastestMs = elapsed;
      if (Date.now() >= a.cooldownUntil) a.energy = Math.min(QC_CONFIG.skill.energyMax, a.energy + QC_CONFIG.skill.energyPerCorrect);
      a.correctSince++; let granted = null;
      if (a.correctSince >= QC_CONFIG.items.every) { a.correctSince = 0; granted = this.grantItem(a); }
      this.battle.onResolved({ type: 'answer:resolved', attackerId: pid, index, correct: true, damage: dmg, rawDamage: rawDmg, shielded, skillUsed, streaks: this.streaks(), hps: this.hps(), elapsedMs: elapsed, granted });
      this.pushState();
      setTimeout(() => { if (!shielded && d.hp <= 0 && this.round >= QC_CONFIG.minQuestions) this.end(pid); else this.nextQuestion(); }, QC_CONFIG.resolvePauseMs);
    }
    grantItem(a) {
      const def = ITEMS[Math.floor(Math.random() * ITEMS.length)];
      if (def.id === 'shield') a.shields = Math.min(QC_CONFIG.items.maxShields, a.shields + 1);
      else a.itemBag[def.id]++;
      return def.id;
    }
    wrong(pid, index) {
      const a = this.rt[pid];
      this.locked.add(pid); a.stats.wrong++; a.streak = 0; if (a.skillBuff) a.skillBuff = false;
      this.battle.onResolved({ type: 'answer:resolved', attackerId: pid, index, correct: false, streaks: this.streaks() });
      this.pushState();
      if (this.ids.every(id => this.locked.has(id))) { this.clearTimers(); setTimeout(() => this.nextQuestion(), QC_CONFIG.wrongPauseMs); }
    }
    // --- intents ---
    localSkill() { this.arm('you'); }
    arm(pid) {
      const a = this.rt[pid], now = Date.now();
      if (a.skillBuff || a.energy < QC_CONFIG.skill.energyMax || now < a.cooldownUntil) return;
      a.skillBuff = true; a.energy = 0; a.cooldownUntil = now + QC_CONFIG.skill.cooldownMs;
      if (pid === 'you') QC_Audio.play('skill');
      this.pushState();
    }
    localItem(id) { this.useItem('you', id); }
    useItem(pid, id) {
      const a = this.rt[pid];
      if (id === 'heal') {
        if (a.itemBag.heal <= 0) return;
        a.itemBag.heal--; a.hp = Math.min(QC_CONFIG.maxHp, a.hp + QC_CONFIG.items.healAmount);
        this.battle.onHealed({ by: pid, hps: this.hps() }); this.pushState();
      } else if (id === 'insight') {
        if (a.itemBag.insight <= 0 || this.locked.has(pid)) return;
        a.itemBag.insight--;
        const wrongs = [0, 1, 2, 3].filter(i => i !== this.current.answer);
        const remove = shuffle(wrongs).slice(0, 2);
        this.battle.onInsight({ questionId: this.current.id, remove }); this.pushState();
      }
    }
    localEmote(emoji, isAI) {
      const pid = isAI ? 'ai' : 'you';
      this.battle.showEmote(pid, emoji);
    }
    pushState() {
      const now = Date.now();
      this.battle.onActorState({
        round: this.round,
        players: this.ids.map(id => {
          const a = this.rt[id];
          return {
            id, hp: a.hp, streak: a.streak, energy: a.energy, skillBuff: a.skillBuff, cooldownUntil: a.cooldownUntil,
            shields: a.shields, items: Object.assign({}, a.itemBag),
            skillReady: a.energy >= QC_CONFIG.skill.energyMax && now >= a.cooldownUntil && !a.skillBuff
          };
        })
      });
    }
    end(winnerId) {
      this.current = null;
      const stats = {}; for (const id of this.ids) stats[id] = Object.assign({ maxStreak: this.rt[id].maxStreak }, this.rt[id].stats);
      this.battle.handleEnd({ type: 'match:end', winnerId, stats });
    }
    destroy() { this.clearTimers(); clearTimeout(this.timer); this.current = null; }
  }

  new GameClient().start();
})();
