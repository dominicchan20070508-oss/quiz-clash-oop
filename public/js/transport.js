// transport.js — 网络层：SSE 下行 + fetch POST 上行
(function (global) {
  async function post(url, body) {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {})
    });
    let data = {};
    try { data = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(data.error || ('请求失败 (' + r.status + ')'));
    return data;
  }

  class Transport {
    constructor() { this.es = null; this.handlers = []; this.connected = false; this.creds = null; }
    onMessage(cb) { this.handlers.push(cb); }
    emit(msg) { this.handlers.forEach(h => { try { h(msg); } catch (e) { console.error(e); } }); }

    async createRoom(name, char) {
      const d = await post('/api/room/create', { name, char });
      return d;
    }
    async joinRoom(code, name, char) {
      const d = await post('/api/room/join', { code: String(code).toUpperCase(), name, char });
      return d;
    }
    connect(creds) {
      this.creds = creds;
      const q = '?room=' + encodeURIComponent(creds.code) + '&player=' + encodeURIComponent(creds.playerId) + '&token=' + encodeURIComponent(creds.token);
      this.es = new EventSource('/api/events' + q);
      this.es.onmessage = (ev) => {
        let msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
        this.connected = true; this.emit(msg);
      };
      this.es.onerror = () => { this.connected = false; this.emit({ type: '__transport_error' }); };
    }
    async send(action, payload) {
      const c = this.creds;
      return post('/api/action', { room: c.code, player: c.playerId, token: c.token, action, payload });
    }
    close() { if (this.es) { try { this.es.close(); } catch (e) {} this.es = null; } this.connected = false; }
  }

  global.QC_post = post;
  global.Transport = Transport;
})(window);
