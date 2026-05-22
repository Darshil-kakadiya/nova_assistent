import VoiceEngine    from './voice/voiceEngine.js';
import TTSEngine      from './voice/ttsEngine.js';
import PCController   from './pc-control/pcController.js';
import SystemMonitor  from './pc-control/systemMonitor.js';
import FileManager    from './pc-control/fileManager.js';
import AppLauncher    from './pc-control/appLauncher.js';
import WebsiteBuilder from './pc-control/websiteBuilder.js';
import AgentManager   from './agents/agentManager.js';
import ConversationEngine from './conversation/conversationEngine.js';
import Memory         from './memory/memory.js';
import EventBus       from './event-bus/eventBus.js';
import Scheduler      from './scheduler/scheduler.js';
import PluginManager  from './plugins/pluginManager.js';
import APIServer      from '../api/apiServer.js';
import llmService     from './llm/llmService.js';
import logger         from '../utils/logger.js';

const C = {
  reset:  '\x1b[0m',
  blue:   '\x1b[34m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  magenta:'\x1b[35m',
  bold:   '\x1b[1m',
};

class JARVIS {
  constructor() {
    this.name       = 'JARVIS';
    this.version    = '1.0.0';
    this.isActive   = false;
    this.startTime  = null;

    this.eventBus   = new EventBus();
    this.memory     = new Memory();
    this.tts        = new TTSEngine();
    this.voice      = new VoiceEngine(this.eventBus);
    this.pc         = new PCController(this.eventBus);
    this.monitor    = new SystemMonitor(this.eventBus);
    this.files      = new FileManager(this.eventBus);
    this.launcher   = new AppLauncher(this.eventBus);
    this.websites   = new WebsiteBuilder(this.eventBus);
    this.agents     = new AgentManager(this.eventBus, this.memory);
    this.convo      = new ConversationEngine(this.eventBus, this.memory);
    this.scheduler  = new Scheduler(this.eventBus);
    this.plugins    = new PluginManager(this.eventBus, this.memory);
    this.api        = new APIServer(this.eventBus, this.agents, this.memory, 3000, this);
  }

  /* ─── Boot ──────────────────────────────────────────────── */
  async initialize() {
    this._banner();
    this.startTime = Date.now();

    await this.memory.load();           logger.info('📚 Memory loaded');
    await this.tts.initialize();        logger.info('🔊 TTS ready');
    await this.agents.initialize();     logger.info('🤖 Agents online');
    await this.pc.initialize();         logger.info('🖥️  PC Control ready');
    await this.monitor.initialize();    logger.info('📊 System Monitor active');
    await this.files.initialize();      logger.info('📁 File Manager ready');
    await this.launcher.initialize();   logger.info('🚀 App Launcher ready');
    await this.websites.initialize();   logger.info('🌐 Website Builder ready');
    await this.scheduler.initialize();  logger.info('⏰ Scheduler ready');
    await this.plugins.initialize();    logger.info('🔌 Plugins ready');

    this._setupEvents();

    // Start API server (non-blocking)
    this.api.start().catch(() => logger.warn('API server could not start'));

    // Start voice LAST (blocks on stdin)
    await this.voice.initialize();

    this.isActive = true;
    await this.speak('JARVIS online. All systems operational. How may I assist you today?');
    this._help();

    // Default reminders
    this.scheduler.addInHours('Hydration check — drink some water!', 1);
    this.scheduler.addDailyAt('Good morning! Ready to make today exceptional.', 8, 0);
  }

  /* ─── Event wiring ──────────────────────────────────────── */
  _setupEvents() {
    this.eventBus.on('voice:command',    cmd  => this.handleCommand(cmd));
    this.eventBus.on('agent:response',   resp => this.speak(resp.message));
    this.eventBus.on('system:alert',     a    => { logger.warn(a.message); this.speak(a.message); });
    this.eventBus.on('voice:sleeping',   ()   => logger.info('💤 Dormant mode'));
    this.eventBus.on('voice:wake-word-detected', () => this.speak('Yes? I\'m listening.'));
  }

  /* ─── Command router ────────────────────────────────────── */
  async handleCommand(raw) {
    const cmd = raw.trim();
    if (!cmd) return { agent: 'JARVIS', response: '' };

    console.log(`${C.cyan}\n📥 You: "${cmd}"${C.reset}`);

    // ── Built-in system commands ─────────────────────────────
    switch (cmd.toLowerCase()) {
      case 'help':           return { agent: 'JARVIS', response: this._help() };
      case 'agents':         return { agent: 'JARVIS', response: this._listAgents() };
      case 'status':         return { agent: 'JARVIS', response: await this._status() };
      case 'clear':          console.clear(); return { agent: 'JARVIS', response: 'Console cleared.' };
      case 'history':        return { agent: 'JARVIS', response: this._history() };
      case 'diagnostics':    return { agent: 'JARVIS', response: await this._diagnostics() };
      case 'reminders':      return { agent: 'JARVIS', response: this._listReminders() };
      case 'plugins':        return { agent: 'JARVIS', response: this._listPlugins() };
      case 'new conversation':
      case 'clear chat':
      case 'reset chat':
        llmService.clearHistory();
        const clearMsg = 'Conversation cleared. Ready for a fresh start.';
        await this.speak(clearMsg);
        return { agent: 'JARVIS', response: clearMsg };
      case 'api':
        const apiMsg = 'API running at http://localhost:3000';
        console.log(`${C.green}${apiMsg}${C.reset}`);
        return { agent: 'JARVIS', response: apiMsg };
    }

    // ── Plugin check ─────────────────────────────────────────
    const pluginResult = await this.plugins.execute(cmd);
    if (pluginResult) {
      await this.speak(pluginResult);
      return { agent: 'Plugin', response: pluginResult };
    }

    // ── Website builder ───────────────────────────────────────
    const folderName = this.websites.matchCommand(cmd);
    if (folderName) {
      await this.speak(`Building a complete website in "${folderName}"... this may take a moment.`);
      const result = await this.websites.build(folderName, cmd);
      await this.speak(result);
      return { agent: 'WebsiteBuilder', response: result };
    }

    // ── YouTube play ──────────────────────────────────────────
    const ytQuery = this._parseYouTubeCommand(cmd);
    if (ytQuery) {
      const result = await this.launcher.playOnYouTube(ytQuery);
      await this.speak(result);
      return { agent: 'AppLauncher', response: result };
    }

    // ── Reminder / schedule ──────────────────────────────────
    if (/remind me|set reminder|reminder/i.test(cmd)) {
      const id = this.scheduler.parseCommand(cmd);
      if (id) {
        const result = 'Reminder set. I will notify you on time.';
        await this.speak(result);
        return { agent: 'Scheduler', response: result };
      }
    }

    // ── Screenshot ───────────────────────────────────────────
    if (/screenshot|capture screen|take screenshot/i.test(cmd)) {
      const r = await this.pc.takeScreenshot();
      await this.speak(r);
      return { agent: 'PCController', response: r };
    }

    // ── PC control (volume, brightness, shutdown…) ────────────
    if (this._isPCCmd(cmd)) {
      const r = await this.pc.processCommand(cmd);
      if (r) await this.speak(r);
      return { agent: 'PCController', response: r || 'PC command executed.' };
    }

    // ── Open / launch app ────────────────────────────────────
    const openM = cmd.match(/^(?:open|launch|start)\s+(.+)/i);
    if (openM) {
      const r = await this.launcher.launch(openM[1].trim());
      await this.speak(r);
      return { agent: 'AppLauncher', response: r };
    }

    // ── Close app ────────────────────────────────────────────
    const closeM = cmd.match(/^(?:close|quit|kill)\s+(.+)/i);
    if (closeM) {
      const r = await this.launcher.close(closeM[1].trim());
      await this.speak(r);
      return { agent: 'AppLauncher', response: r };
    }

    // ── File management ──────────────────────────────────────
    if (this._isFileCmd(cmd)) {
      const r = await this.files.processCommand(cmd);
      if (r) {
        await this.speak(r);
        return { agent: 'FileManager', response: r };
      }
    }

    // ── Dynamic agent routing ─────────────────────────────────
    const agent = await this.agents.selectAgentDynamically(cmd);
    if (agent && agent.name !== 'Prime') {
      const response = await agent.process(cmd);
      await this.speak(response);
      await this.memory.addConversation({ command: cmd, response, agent: agent.name, timestamp: new Date() });
      this.convo.addToHistory(cmd, response, agent.name);
      return { agent: agent.name, response };
    }

    // ── Natural conversation (fallback — uses chat history) ───
    logger.info('💬 Natural conversation mode');
    const chatResponse = await llmService.chat(cmd);
    await this.speak(chatResponse);
    await this.memory.addConversation({ command: cmd, response: chatResponse, agent: 'JARVIS', timestamp: new Date() });
    this.convo.addToHistory(cmd, chatResponse, 'JARVIS');
    return { agent: 'JARVIS', response: chatResponse };
  }

  _parseYouTubeCommand(cmd) {
    const trimmed = cmd.trim();
    // Pattern 1: play/search/find/open [query] on youtube, play [query] youtube
    const m1 = trimmed.match(/^(?:play|search|find|open)\s+(.+?)\s+(?:on\s+)?youtube$/i);
    if (m1) return m1[1].trim();
    
    // Pattern 2: youtube play/search/find [query]
    const m2 = trimmed.match(/^youtube\s+(?:play|search|find|and\s+play)?\s+(.+)$/i);
    if (m2) return m2[1].trim();

    // Pattern 3: open youtube and play [query], open youtube play [query]
    const m3 = trimmed.match(/^(?:open|launch|start)\s+youtube\s+(?:and\s+)?(?:play\s+)?(.+)$/i);
    if (m3) return m3[1].trim();

    return null;
  }

  // Deleted unused static routing helper _getSpecialAgent

  _isPCCmd(cmd) {
    return /\b(volume|brightness|shutdown|restart|sleep|mute|unmute|play media|pause media|next track|previous track|kill process|task manager)\b/i.test(cmd);
  }

  _isFileCmd(cmd) {
    return /\b(list files|show files|find file|search file|delete file|delete folder|open file|organize files|move file|copy file|copy folder|move folder|paste|create folder|make folder|new folder)\b/i.test(cmd);
  }

  /* ─── TTS ───────────────────────────────────────────────── */
  async speak(text) {
    console.log(`${C.green}\n🔊 JARVIS: ${text}\n${C.reset}`);
    try { await this.tts.speak(text); } catch {}
  }

  /* ─── Shutdown ──────────────────────────────────────────── */
  async shutdown() {
    logger.warn('🔴 Shutdown initiated...');
    await this.speak('Initiating shutdown sequence. Saving all data. Goodbye.');
    await this.memory.save();
    this.monitor.stopMonitoring();
    this.scheduler.stop();
    await this.api.stop();
    this.isActive = false;
    logger.success('JARVIS shutdown complete.');
  }

  /* ─── Display helpers ───────────────────────────────────── */
  _banner() {
    console.log(`${C.blue}${C.bold}
╔══════════════════════════════════════════════════════════════════╗
║        ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗                  ║
║        ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝                  ║
║        ██║███████║██████╔╝██║   ██║██║███████╗                  ║
║   ██   ██║██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║                  ║
║   ╚█████╔╝██║  ██║██║  ██║ ╚████╔╝ ██║███████║                  ║
║    ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝                  ║
║         Just A Rather Very Intelligent System  v1.0.0            ║
╚══════════════════════════════════════════════════════════════════╝
${C.reset}`);
  }

  _help() {
    const text = `
┌──────────────────────────── JARVIS HELP ────────────────────────────┐
│  SYSTEM          help · status · agents · history · clear            │
│                  diagnostics · reminders · plugins · api             │
│                  new conversation · reset chat                       │
│                                                                      │
│  MEDIA           play [song] on youtube                              │
│                  open spotify · open vlc                             │
│                                                                      │
│  PC CONTROL      open [app]   close [app]   screenshot               │
│                  volume up/down/mute   brightness [0-100]            │
│                  shutdown · restart · sleep                          │
│                                                                      │
│  FILE MANAGEMENT                                                     │
│    make folder [name]   create folder [name] in [location]           │
│    copy [folder] to [destination]                                    │
│    move [folder] to [destination]                                    │
│    delete folder [name]   list files in [folder]                     │
│    find file [name]   organize files                                 │
│                                                                      │
│  AI WEBSITE BUILDER                                                  │
│    make folder MyApp and build a website                             │
│    create a website called Portfolio                                 │
│                                                                      │
│  NATURAL CONVERSATION  (just talk! JARVIS remembers the context)     │
│    "What's the capital of Japan?"                                    │
│    "How do I sort a list in Python?"                                 │
│    "Tell me a joke"                                                  │
│                                                                      │
│  AGENTS (auto-routed)                                                │
│  schedule/meeting → Herald  │  code/debug     → Steve               │
│  music/spotify   → Jerome   │  crypto/stock   → Gecko               │
│  workout/gym     → Hercules │  stress/tired   → Pepper              │
│  security/scan   → Ultron   │  analytics      → Stark               │
│  strategy/plan   → Athena   │  offline/backup → Hulk                │
│                                                                      │
│  HINDI / HINGLISH    e.g. "chrome kholo" · "screenshot lo"           │
│  REMINDERS           "remind me in 30 minutes to take a break"       │
│  PLUGINS             add .js files to /plugins — auto-loaded         │
└──────────────────────────────────────────────────────────────────────┘`;
    console.log(`${C.yellow}${text}${C.reset}`);
    return text;
  }

  _listAgents() {
    const list = this.agents.getAllAgents();
    let text = `🤖 Active Agents (${list.length}):\n\n`;
    for (const a of list) {
      text += `  ${a.name.padEnd(12)} ${a.description}\n`;
    }
    console.log(`${C.magenta}\n${text}${C.reset}`);
    return text;
  }

  async _status() {
    const mem  = process.memoryUsage();
    const up   = Math.floor((Date.now() - this.startTime) / 1000);
    const sys  = await this.monitor.getSummary();
    const cleanSys = sys.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    const text = `
┌──────────────────── JARVIS STATUS ─────────────────────┐
│ Status:  ✅ ONLINE                                      │
│ Uptime:  ${String(up + 's').padEnd(45)}│
│ Agents:  ${String(this.agents.agents.size + ' active').padEnd(45)}│
│ Heap:    ${String((mem.heapUsed/1024/1024).toFixed(1)+'MB').padEnd(45)}│
│ Node:    ${String(process.version).padEnd(45)}│
│ OS:      ${String(process.platform).padEnd(45)}│
│ API:     http://localhost:3000                          │
└─────────────────────────────────────────────────────────┘
${cleanSys}`;
    console.log(`${C.green}${text}${C.reset}`);
    return text;
  }

  _history() {
    const h = this.memory.getConversationHistory(10);
    if (!h.length) { 
      const text = '(No history yet)';
      console.log(text);
      return text;
    }
    let text = `📋 Last ${h.length} conversations:\n\n`;
    for (const c of h) {
      const t = new Date(c.timestamp).toLocaleTimeString();
      text += `  [${t}] You:    ${c.command}\n`;
      text += `        JARVIS: ${String(c.response).substring(0, 90)}...\n\n`;
    }
    console.log(`${C.yellow}\n${text}${C.reset}`);
    return text;
  }

  async _diagnostics() {
    const hulk = this.agents.getAgent('hulk');
    const res = await hulk.process('diagnostics');
    console.log(C.blue + res + C.reset);
    return res;
  }

  _listReminders() {
    const list = this.scheduler.list();
    if (!list.length) {
      const text = '(No active reminders)';
      console.log(text);
      return text;
    }
    let text = `⏰ Active Reminders (${list.length}):\n\n`;
    for (const r of list) {
      text += `  [${r.id}] "${r.message}" → ${r.fireAt} ${r.recurring ? '(recurring)' : ''}\n`;
    }
    console.log(`${C.yellow}\n${text}${C.reset}`);
    return text;
  }

  _listPlugins() {
    const list = this.plugins.list();
    if (!list.length) {
      const text = '(No plugins loaded. Add .js files to /plugins)';
      console.log(text);
      return text;
    }
    let text = `🔌 Loaded Plugins (${list.length}):\n\n`;
    for (const p of list) {
      text += `  ${p.name.padEnd(14)} ${p.description}\n`;
    }
    console.log(`${C.magenta}\n${text}${C.reset}`);
    return text;
  }
}

export default JARVIS;
