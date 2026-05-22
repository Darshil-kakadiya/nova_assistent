/**
 * JARVIS API Server
 * Exposes REST endpoints so dashboards, mobile apps, or scripts can control JARVIS.
 * Run alongside the main process via the EventBus.
 */
import http from 'http';
import logger from '../utils/logger.js';

class APIServer {
  constructor(eventBus, agentManager, memory, port = 3000, jarvis = null) {
    this.eventBus = eventBus;
    this.agentManager = agentManager;
    this.memory = memory;
    this.port = port;
    this.server = null;
    this.jarvis = jarvis;
  }

  async start() {
    this.server = http.createServer((req, res) => this._route(req, res));
    this.server.listen(this.port, () => {
      logger.success(`🌐 API Server listening on http://localhost:${this.port}`);
    });
  }

  async stop() {
    if (this.server) this.server.close();
  }

  _json(res, code, data) {
    res.writeHead(code, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(data, null, 2));
  }

  async _body(req) {
    return new Promise((resolve) => {
      let raw = '';
      req.on('data', c => raw += c);
      req.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch { resolve({}); }
      });
    });
  }

  async _route(req, res) {
    const url = req.url.split('?')[0];
    const method = req.method.toUpperCase();

    // CORS pre-flight
    if (method === 'OPTIONS') return this._json(res, 200, {});

    // ── GET /status ──────────────────────────────────────────────────
    if (method === 'GET' && url === '/status') {
      return this._json(res, 200, {
        status: 'online',
        uptime: process.uptime(),
        agents: this.agentManager.agents.size,
        memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1) + 'MB',
        node: process.version,
        platform: process.platform,
      });
    }

    // ── GET /agents ──────────────────────────────────────────────────
    if (method === 'GET' && url === '/agents') {
      return this._json(res, 200, this.agentManager.getAllAgents());
    }

    // ── GET /history ─────────────────────────────────────────────────
    if (method === 'GET' && url === '/history') {
      return this._json(res, 200, this.memory.getConversationHistory(20));
    }

    // ── POST /command ─────────────────────────────────────────────────
    if (method === 'POST' && url === '/command') {
      const body = await this._body(req);
      const command = body.command || '';
      if (!command) return this._json(res, 400, { error: 'command is required' });

      let responseText = '';
      let agentName = 'JARVIS';

      if (this.jarvis) {
        try {
          const result = await this.jarvis.handleCommand(command);
          responseText = result.response;
          agentName = result.agent;
        } catch (err) {
          responseText = `Error processing command: ${err.message}`;
        }
      } else {
        this.eventBus.emit('voice:command', command);
        responseText = 'Command submitted for background processing.';
      }

      return this._json(res, 200, { received: command, agent: agentName, response: responseText });
    }

    // ── POST /speak ───────────────────────────────────────────────────
    if (method === 'POST' && url === '/speak') {
      const body = await this._body(req);
      this.eventBus.emit('agent:response', { message: body.text || '' });
      return this._json(res, 200, { status: 'speaking' });
    }

    // ── GET /memory/stats ─────────────────────────────────────────────
    if (method === 'GET' && url === '/memory/stats') {
      return this._json(res, 200, {
        conversations: this.memory.conversations.length,
        activities: this.memory.activities.length,
        preferences: Object.keys(this.memory.preferences).length,
      });
    }

    return this._json(res, 404, { error: 'Not found', endpoints: [
      'GET  /status',
      'GET  /agents',
      'GET  /history',
      'GET  /memory/stats',
      'POST /command   { "command": "..." }',
      'POST /speak     { "text": "..." }',
    ]});
  }
}

export default APIServer;
