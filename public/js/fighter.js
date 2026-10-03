// fighter.js — 角色 SVG 立绘（Fighter）+ 技能与粒子系统（Effects）
(function (global) {
  const CHARACTERS = global.CHARACTERS;
  function byId(id) { return CHARACTERS.find(c => c.id === id) || CHARACTERS[0]; }

  /* ---------------- 立绘 SVG ---------------- */
  function weaponSVG(c) {
    switch (c.id) {
      case 'ignis': // 法杖 + 火焰珠
        return '<line x1="127" y1="158" x2="152" y2="50" stroke="#6b4a2b" stroke-width="7" stroke-linecap="round"/>'
          + '<circle cx="154" cy="44" r="15" fill="' + c.color + '"/>'
          + '<circle cx="150" cy="40" r="7" fill="' + c.color2 + '"/>'
          + '<path d="M154 24 Q162 34 156 42 Q150 34 154 24Z" fill="' + c.color2 + '"/>';
      case 'volt': // 武士刀
        return '<line x1="124" y1="160" x2="178" y2="84" stroke="#3a2f2a" stroke-width="7" stroke-linecap="round"/>'
          + '<line x1="128" y1="154" x2="182" y2="78" stroke="#e6f0ff" stroke-width="5" stroke-linecap="round"/>'
          + '<line x1="122" y1="150" x2="138" y2="164" stroke="' + c.color + '" stroke-width="5" stroke-linecap="round"/>';
      case 'frost': // 弓 + 箭
        return '<path d="M150 78 Q114 120 150 162" fill="none" stroke="#dff3ff" stroke-width="5" stroke-linecap="round"/>'
          + '<line x1="150" y1="78" x2="150" y2="162" stroke="' + c.color + '" stroke-width="1.5"/>'
          + '<line x1="118" y1="120" x2="158" y2="120" stroke="#eaf9ff" stroke-width="4" stroke-linecap="round"/>'
          + '<path d="M158 120 L150 115 L150 125 Z" fill="' + c.color + '"/>';
      case 'shadow': // 双匕首
        return '<line x1="120" y1="150" x2="146" y2="118" stroke="#20222e" stroke-width="6" stroke-linecap="round"/>'
          + '<line x1="122" y1="148" x2="148" y2="116" stroke="' + c.color + '" stroke-width="2.5"/>'
          + '<line x1="72" y1="150" x2="52" y2="126" stroke="#20222e" stroke-width="6" stroke-linecap="round"/>'
          + '<line x1="70" y1="148" x2="50" y2="124" stroke="' + c.color + '" stroke-width="2.5"/>';
      case 'terra': // 巨锤
        return '<line x1="127" y1="158" x2="150" y2="78" stroke="#7a5a30" stroke-width="8" stroke-linecap="round"/>'
          + '<rect x="132" y="56" width="40" height="28" rx="7" fill="#8a8f9c"/>'
          + '<rect x="136" y="60" width="32" height="20" rx="5" fill="' + c.color + '"/>';
      default: return '';
    }
  }

  function charSVG(c) {
    return '<svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">'
      + '<ellipse cx="100" cy="244" rx="46" ry="12" fill="rgba(0,0,0,.35)"/>'
      + '<g class="body">'
      + '<path d="M62 96 Q38 172 66 214 L86 210 Q70 150 80 100 Z" fill="' + c.color2 + '" fill-opacity=".8"/>'
      + '<rect x="80" y="158" width="18" height="72" rx="9" fill="#333a58"/>'
      + '<rect x="104" y="158" width="18" height="72" rx="9" fill="#3f4768"/>'
      + '<rect x="62" y="104" width="15" height="54" rx="8" fill="' + c.color2 + '"/>'
      + '<path d="M70 96 Q100 82 132 96 L128 164 Q100 176 74 164 Z" fill="' + c.color + '"/>'
      + '<path d="M74 150 Q100 160 128 150 L128 166 Q100 178 74 166 Z" fill="#262b45"/>'
      + '<circle cx="100" cy="66" r="23" fill="#f3c89a"/>'
      + '<path d="M76 64 Q78 42 100 42 Q122 42 124 64 Q116 52 100 52 Q84 52 76 64 Z" fill="' + c.color2 + '"/>'
      + '<circle cx="92" cy="67" r="2.6" fill="#2a2540"/><circle cx="108" cy="67" r="2.6" fill="#2a2540"/>'
      + '<path d="M92 76 Q100 80 108 76" fill="none" stroke="#b5794f" stroke-width="2" stroke-linecap="round"/>'
      + '<rect x="120" y="104" width="15" height="52" rx="8" fill="' + c.color + '"/>'
      + '<circle cx="127" cy="158" r="9" fill="#f3c89a"/>'
      + weaponSVG(c)
      + '</g></svg>';
  }

  class Fighter {
    constructor(container, charId, side, label) {
      this.char = byId(charId); this.side = side;
      this.el = document.createElement('div');
      this.el.className = 'fighter ' + side;
      this.el.innerHTML = charSVG(this.char) + '<div class="fname">' + (label || (this.char.title + ' · ' + this.char.name)) + '</div>';
      container.appendChild(this.el);
    }
    state(s) {
      this.el.classList.remove('is-attacking', 'is-hit', 'is-victory', 'is-defeat', 'flash');
      void this.el.offsetWidth;
      if (s === 'attack') this.el.classList.add('is-attacking');
      else if (s === 'hit') { this.el.classList.add('is-hit', 'flash'); setTimeout(() => this.el.classList.remove('flash'), 420); }
      else if (s === 'victory') this.el.classList.add('is-victory');
      else if (s === 'defeat') this.el.classList.add('is-defeat');
    }
    chest() {
      const r = this.el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height * 0.42 };
    }
    destroy() { this.el.remove(); }
  }

  /* ---------------- 技能 / 粒子系统 ---------------- */
  const DUR = { fire: 620, lightning: 290, ice: 520, shadow: 380, rock: 720 };
  const SHAKE = { fire: 8, lightning: 7, ice: 5, shadow: 6, rock: 13 };

  class Effects {
    constructor(canvas) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.parts = []; this.proj = []; this.raf = null; this.last = 0;
      this.resize();
      global.addEventListener('resize', () => this.resize());
    }
    resize() {
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const w = this.cv.clientWidth, h = this.cv.clientHeight;
      this.dpr = dpr; this.w = w; this.h = h;
      this.cv.width = Math.max(1, Math.round(w * dpr));
      this.cv.height = Math.max(1, Math.round(h * dpr));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    toLocal(pt) { const r = this.cv.getBoundingClientRect(); return { x: pt.x - r.x, y: pt.y - r.y }; }
    add(p) { this.parts.push(p); }
    shakeStage(mag) {
      const st = this.cv.parentElement;
      st.style.setProperty('--shake', mag + 'px');
      st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake');
    }
    launch(attacker, defender) {
      this.resize();
      const c = attacker.char;
      const s = this.toLocal(attacker.chest()), e = this.toLocal(defender.chest());
      this.proj.push({ effect: c.effect, char: c, sx: s.x, sy: s.y, tx: e.x, ty: e.y, t: 0, dur: DUR[c.effect], seed: Math.random() * 10, trail: [] });
      this.ensureLoop();
    }
    burst(x, y, c) {
      const eff = c.effect;
      const mk = (o) => Object.assign({ x, y, life: 1, max: 1, vx: 0, vy: 0, size: 4, color: '#fff', shape: 'circle', grav: 0, drag: 0 }, o);
      const rnd = (a, b) => a + Math.random() * (b - a);
      if (eff === 'fire') {
        for (let i = 0; i < 28; i++) { const a = rnd(0, Math.PI * 2), sp = rnd(60, 300);
          this.add(mk({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, grav: 260, max: rnd(.4, .9), size: rnd(2, 6), color: Math.random() < .5 ? '#ff8a3d' : '#ffd23f' })); }
        this.add(mk({ shape: 'flash', max: .35, size: 30, color: '#ffb020' }));
      } else if (eff === 'lightning') {
        for (let i = 0; i < 24; i++) { const a = rnd(0, Math.PI * 2), sp = rnd(120, 380);
          this.add(mk({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 0, drag: 240, max: rnd(.25, .55), size: rnd(2, 4), color: Math.random() < .5 ? '#ffe680' : '#8ff0ff', shape: 'line' })); }
        this.add(mk({ shape: 'flash', max: .3, size: 34, color: '#fff3b0' }));
      } else if (eff === 'ice') {
        for (let i = 0; i < 22; i++) { const a = rnd(0, Math.PI * 2), sp = rnd(70, 260);
          this.add(mk({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 40, grav: 200, max: rnd(.5, 1), size: rnd(4, 9), color: Math.random() < .5 ? '#bfeaff' : '#ffffff', shape: 'tri', rot: rnd(0, 6), vr: rnd(-6, 6) })); }
        this.add(mk({ shape: 'ring', max: .55, size: 16, color: '#9fe4ff' }));
      } else if (eff === 'shadow') {
        for (let i = 0; i < 26; i++) { const a = rnd(0, Math.PI * 2), sp = rnd(30, 160);
          this.add(mk({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, grav: -60, max: rnd(.5, 1.1), size: rnd(6, 16), color: Math.random() < .5 ? '#6b3fa0' : '#2a1a45', grow: 26 })); }
        this.add(mk({ shape: 'flash', max: .4, size: 36, color: '#b07dff' }));
      } else if (eff === 'rock') {
        for (let i = 0; i < 24; i++) { const a = rnd(0, Math.PI * 2), sp = rnd(80, 320);
          this.add(mk({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, grav: 460, max: rnd(.5, 1), size: rnd(3, 8), color: Math.random() < .5 ? '#a98a3e' : '#7d746b', shape: 'rect', rot: rnd(0, 6), vr: rnd(-8, 8) })); }
        this.add(mk({ shape: 'ring', max: .5, size: 20, color: '#c9a227' }));
      }
      this.shakeStage(SHAKE[eff]);
    }

    ensureLoop() { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(t => this.loop(t)); } }
    loop(t) {
      const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      // projectiles
      for (let i = this.proj.length - 1; i >= 0; i--) {
        const p = this.proj[i]; p.t += dt * 1000;
        const k = Math.min(1, p.t / p.dur);
        let x = p.sx + (p.tx - p.sx) * k, y = p.sy + (p.ty - p.sy) * k;
        if (p.effect === 'rock') y -= Math.sin(k * Math.PI) * 70;
        this.drawProj(p, x, y, k);
        if (k >= 1) { this.burst(p.tx, p.ty, p.char); this.proj.splice(i, 1); }
      }
      // particles
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const q = this.parts[i];
        q.life -= dt / q.max;
        if (q.life <= 0) { this.parts.splice(i, 1); continue; }
        q.vy += (q.grav || 0) * dt;
        if (q.drag) { const f = Math.max(0, 1 - q.drag * dt / 60); q.vx *= f; q.vy *= f; }
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.vr) q.rot = (q.rot || 0) + q.vr * dt;
        if (q.grow) q.size += q.grow * dt;
        this.drawPart(q);
      }

      if (this.proj.length || this.parts.length) this.raf = requestAnimationFrame(z => this.loop(z));
      else { this.raf = null; ctx.clearRect(0, 0, this.w, this.h); }
    }

    drawProj(p, x, y, k) {
      const ctx = this.ctx;
      ctx.save(); ctx.translate(x, y);
      if (p.effect === 'fire') {
        const r = 15 + Math.sin(performance.now() / 60) * 2;
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.8);
        g.addColorStop(0, '#fff2b0'); g.addColorStop(.4, p.char.color); g.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, 7); ctx.fill();
        if (Math.random() < .8) this.add({ x, y: y + rnd(-6, 6), life: 1, max: .5, vx: -60, vy: rnd(-30, 30), size: rnd(2, 4), color: Math.random() < .5 ? '#ff8a3d' : '#ffd23f', drag: 60 });
      } else if (p.effect === 'lightning') {
        ctx.restore();
        // jagged bolt from start to current
        ctx.strokeStyle = '#eafcff'; ctx.lineWidth = 3; ctx.shadowColor = '#8ff0ff'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(p.sx, p.sy);
        const seg = 6;
        for (let s = 1; s <= seg; s++) { const kk = s / seg; const xx = p.sx + (x - p.sx) * kk, yy = p.sy + (y - p.sy) * kk;
          ctx.lineTo(xx + rnd(-10, 10), yy + rnd(-10, 10)); }
        ctx.stroke(); ctx.shadowBlur = 0;
        const g = ctx.createRadialGradient(x, y, 1, x, y, 12); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(140,240,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill();
        return;
      } else if (p.effect === 'ice') {
        ctx.rotate(performance.now() / 120);
        ctx.fillStyle = '#dff4ff'; ctx.strokeStyle = '#8fd8ff'; ctx.lineWidth = 2;
        ctx.beginPath(); for (let s = 0; s < 4; s++) { ctx.rotate(Math.PI / 2); ctx.moveTo(0, 0); ctx.lineTo(6, -14); ctx.lineTo(0, -20); ctx.lineTo(-6, -14); } ctx.closePath(); ctx.fill(); ctx.stroke();
        if (Math.random() < .6) this.add({ x, y, life: 1, max: .7, vx: rnd(-20, 20), vy: rnd(10, 40), size: rnd(2, 4), color: '#cdeeff', shape: 'tri' });
      } else if (p.effect === 'shadow') {
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
        g.addColorStop(0, 'rgba(176,125,255,.9)'); g.addColorStop(.6, 'rgba(60,30,110,.7)'); g.addColorStop(1, 'rgba(20,10,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill();
        if (Math.random() < .7) this.add({ x: x + rnd(-8, 8), y, life: 1, max: .6, vx: rnd(-30, 30), vy: rnd(-50, -10), size: rnd(5, 10), color: '#4a2a80', grow: 18 });
      } else if (p.effect === 'rock') {
        ctx.rotate(performance.now() / 100);
        ctx.fillStyle = '#9a8a5a'; ctx.strokeStyle = '#6b5a30'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 19, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(-6, -5, 5, 0, 7); ctx.arc(7, 6, 4, 0, 7); ctx.fill();
      }
      ctx.restore();
    }

    drawPart(q) {
      const ctx = this.ctx, a = Math.max(0, Math.min(1, q.life));
      ctx.save(); ctx.globalAlpha = a; ctx.translate(q.x, q.y);
      if (q.shape === 'flash') {
        const r = q.size * (1.4 - a * .6);
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r); g.addColorStop(0, q.color); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      } else if (q.shape === 'ring') {
        ctx.strokeStyle = q.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, q.size + (1 - a) * 60, 0, 7); ctx.stroke();
      } else if (q.shape === 'tri') {
        ctx.rotate(q.rot || 0); ctx.fillStyle = q.color;
        ctx.beginPath(); ctx.moveTo(0, -q.size); ctx.lineTo(q.size, q.size); ctx.lineTo(-q.size, q.size); ctx.closePath(); ctx.fill();
      } else if (q.shape === 'rect') {
        ctx.rotate(q.rot || 0); ctx.fillStyle = q.color; ctx.fillRect(-q.size / 2, -q.size / 2, q.size, q.size);
      } else if (q.shape === 'line') {
        ctx.strokeStyle = q.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-q.vx * .03, -q.vy * .03); ctx.stroke();
      } else {
        ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(0, 0, q.size, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  global.Fighter = Fighter;
  global.Effects = Effects;
  global.QC_charSVG = charSVG;
  global.QC_TRAVEL = DUR;
})(window);
