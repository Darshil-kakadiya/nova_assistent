import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

class AppLauncher {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.platform = process.platform;
    this.appMap = {
      'chrome':       { win: 'chrome.exe',      mac: 'Google Chrome',    linux: 'google-chrome' },
      'firefox':      { win: 'firefox.exe',     mac: 'Firefox',          linux: 'firefox' },
      'notepad':      { win: 'notepad.exe',     mac: 'TextEdit',         linux: 'gedit' },
      'vs code':      { win: 'code.exe',        mac: 'Visual Studio Code', linux: 'code' },
      'vscode':       { win: 'code.exe',        mac: 'Visual Studio Code', linux: 'code' },
      'calculator':   { win: 'calc.exe',        mac: 'Calculator',       linux: 'gnome-calculator' },
      'explorer':     { win: 'explorer.exe',    mac: 'Finder',           linux: 'nautilus' },
      'spotify':      { win: 'Spotify.exe',     mac: 'Spotify',          linux: 'spotify' },
      'discord':      { win: 'Discord.exe',     mac: 'Discord',          linux: 'discord' },
      'terminal':     { win: 'wt.exe',          mac: 'Terminal',         linux: 'gnome-terminal' },
      'task manager': { win: 'taskmgr.exe',     mac: 'Activity Monitor', linux: 'gnome-system-monitor' },
      'paint':        { win: 'mspaint.exe',     mac: null,               linux: 'gimp' },
      'cmd':          { win: 'cmd.exe',         mac: 'Terminal',         linux: 'bash' },
      'steam':        { win: 'Steam.exe',       mac: 'Steam',            linux: 'steam' },
      'vlc':          { win: 'vlc.exe',         mac: 'VLC',              linux: 'vlc' },
      'telegram':     { win: 'Telegram.exe',    mac: 'Telegram',         linux: 'telegram-desktop' },
      'whatsapp':     { win: 'WhatsApp.exe',    mac: 'WhatsApp',         linux: 'whatsapp-desktop' },
      'zoom':         { win: 'Zoom.exe',        mac: 'zoom.us',          linux: 'zoom' },
      'slack':        { win: 'Slack.exe',       mac: 'Slack',            linux: 'slack' },
      'word':         { win: 'WINWORD.EXE',     mac: 'Microsoft Word',   linux: 'libreoffice --writer' },
      'excel':        { win: 'EXCEL.EXE',       mac: 'Microsoft Excel',  linux: 'libreoffice --calc' },
      'youtube':      { win: 'https://www.youtube.com', mac: 'https://www.youtube.com', linux: 'https://www.youtube.com' },
    };
  }

  async initialize() { logger.info('App Launcher ready'); }

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

  async launch(appName) {
    const key = appName.toLowerCase().trim();

    // Check for YouTube play command
    const ytQuery = this._parseYouTubeCommand(appName);
    if (ytQuery) {
      return this.playOnYouTube(ytQuery);
    }

    const app = this.appMap[key];

    try {
      if (this.platform === 'win32') {
        const target = app?.win || `${appName}.exe`;
        if (target.startsWith('http')) {
          exec(`start "" "${target}"`);
        } else {
          exec(`start "" "${target}"`);
        }
      } else if (this.platform === 'darwin') {
        const name = app?.mac || appName;
        if (name.startsWith('http')) exec(`open "${name}"`);
        else exec(`open -a "${name}"`);
      } else {
        const cmd = app?.linux || appName;
        if (cmd.startsWith('http')) exec(`xdg-open "${cmd}"`);
        else exec(`${cmd} &`);
      }
      this.eventBus.emit('app:launched', { name: appName });
      return `✅ Launching ${appName}...`;
    } catch (e) {
      return `❌ Could not launch ${appName}: ${e.message}`;
    }
  }

  /**
   * Open YouTube and play a song/query by automatically resolving the first result.
   */
  async playOnYouTube(query) {
    logger.info(`🎵 Searching YouTube for: ${query}`);
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    let targetUrl = searchUrl;
    let playingDirectly = false;

    try {
      // Fetch YouTube search results with a standard browser User-Agent
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (res.ok) {
        const html = await res.text();
        const matches = html.match(/\/watch\?v=[a-zA-Z0-9_-]{11}/g);
        if (matches && matches.length > 0) {
          const id = matches[0].split('=')[1];
          targetUrl = `https://www.youtube.com/watch?v=${id}`;
          playingDirectly = true;
        }
      }
    } catch (e) {
      logger.warn(`Failed to resolve direct YouTube link: ${e.message}. Falling back to search.`);
    }

    try {
      if (this.platform === 'win32') {
        exec(`start "" "${targetUrl}"`);
      } else if (this.platform === 'darwin') {
        exec(`open "${targetUrl}"`);
      } else {
        exec(`xdg-open "${targetUrl}"`);
      }
      this.eventBus.emit('media:youtube', { query, url: targetUrl });
      
      if (playingDirectly) {
        return `🎵 Playing "${query}" directly on YouTube...`;
      } else {
        return `🎵 Opening YouTube search for "${query}"...`;
      }
    } catch (e) {
      return `❌ Could not open YouTube: ${e.message}`;
    }
  }

  /**
   * Play a local media file using VLC or system default.
   */
  async playLocalMedia(filePath) {
    try {
      if (this.platform === 'win32') {
        exec(`start "" "${filePath}"`);
      } else if (this.platform === 'darwin') {
        exec(`open "${filePath}"`);
      } else {
        exec(`xdg-open "${filePath}"`);
      }
      return `🎵 Playing: ${filePath}`;
    } catch (e) {
      return `❌ Could not play: ${e.message}`;
    }
  }

  async close(appName) {
    try {
      if (this.platform === 'win32') {
        const exe = (this.appMap[appName.toLowerCase()]?.win || appName).split('\\').pop();
        await execAsync(`taskkill /IM "${exe}" /F`);
      } else {
        await execAsync(`pkill -f "${appName}"`);
      }
      return `✅ Closed ${appName}`;
    } catch (e) {
      return `❌ Failed to close: ${e.message}`;
    }
  }
}

export default AppLauncher;
