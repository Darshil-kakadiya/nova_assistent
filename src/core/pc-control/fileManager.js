import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

class FileManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.platform = process.platform;
    this.home = os.homedir();
    // Clipboard for copy/paste operations
    this._clipboard = null;
  }

  async initialize() { logger.info('File Manager ready'); }

  /** Main command dispatcher */
  async processCommand(command) {
    const cmd = command.toLowerCase().trim();

    // --- CREATE FOLDER ---
    const makeM = command.match(/(?:make|create|new)\s+(?:a\s+)?(?:new\s+)?folder(?:\s+(?:called|named))?\s+["']?([^"'\n]+?)["']?(?:\s+(?:in|at|inside)\s+["']?([^"'\n]+?)["']?)?$/i);
    if (makeM) {
      const name = makeM[1].trim();
      const location = makeM[2] ? this._resolvePath(makeM[2].trim()) : this.home;
      return this.createFolder(path.join(location, name));
    }

    // --- COPY ---
    const copyM = command.match(/copy\s+["']?([^"'\n]+?)["']?\s+(?:to|into)\s+["']?([^"'\n]+?)["']?$/i);
    if (copyM) {
      return this.copyItem(this._resolvePath(copyM[1].trim()), this._resolvePath(copyM[2].trim()));
    }

    // --- MOVE / PASTE ---
    const moveM = command.match(/(?:move|paste)\s+["']?([^"'\n]+?)["']?\s+(?:to|into|in)\s+["']?([^"'\n]+?)["']?$/i);
    if (moveM) {
      return this.moveItem(this._resolvePath(moveM[1].trim()), this._resolvePath(moveM[2].trim()));
    }

    // --- DELETE ---
    const delM = command.match(/(?:delete|remove)\s+(?:folder|file|directory)?\s*["']?([^"'\n]+?)["']?$/i);
    if (delM) {
      return this.deleteItem(this._resolvePath(delM[1].trim()));
    }

    // --- LIST FILES ---
    if (cmd.includes('list files') || cmd.includes('show files')) {
      const dirM = command.match(/(?:in|from|of)\s+["']?([^"'\n]+?)["']?$/i);
      return this.listFiles(dirM ? this._resolvePath(dirM[1].trim()) : this.home);
    }

    // --- SEARCH ---
    if (cmd.includes('search file') || cmd.includes('find file')) {
      const q = command.replace(/search file|find file/gi, '').trim();
      return this.searchFiles(q);
    }

    // --- ORGANIZE ---
    if (cmd.includes('organize files')) {
      return this.organizeFiles(path.join(this.home, 'Desktop'));
    }

    // --- OPEN FILE ---
    if (cmd.includes('open file')) {
      const p = this._extractQuoted(command) || this._extractPath(command);
      return p ? this.openFile(p) : 'Please specify a file path.';
    }

    return null;
  }

  /** Resolve a named path to an absolute path */
  _resolvePath(p) {
    const aliases = {
      'desktop':   path.join(this.home, 'Desktop'),
      'documents': path.join(this.home, 'Documents'),
      'downloads': path.join(this.home, 'Downloads'),
      'pictures':  path.join(this.home, 'Pictures'),
      'music':     path.join(this.home, 'Music'),
      'videos':    path.join(this.home, 'Videos'),
      'home':      this.home,
    };

    const lower = p.toLowerCase();
    for (const [key, val] of Object.entries(aliases)) {
      if (lower === key) return val;
    }

    // Already absolute
    if (path.isAbsolute(p)) return p;

    // Default: relative to Desktop
    return path.join(this.home, 'Desktop', p);
  }

  createFolder(folderPath) {
    try {
      fs.mkdirSync(folderPath, { recursive: true });
      logger.info(`📁 Created folder: ${folderPath}`);
      this.eventBus.emit('file:created', { path: folderPath });
      return `✅ Folder created: ${folderPath}`;
    } catch (e) {
      return `❌ Could not create folder: ${e.message}`;
    }
  }

  copyItem(src, dest) {
    try {
      if (!fs.existsSync(src)) return `❌ Source not found: ${src}`;
      const destPath = fs.existsSync(dest) && fs.statSync(dest).isDirectory()
        ? path.join(dest, path.basename(src)) : dest;
      const stat = fs.statSync(src);
      if (stat.isDirectory()) {
        fs.cpSync(src, destPath, { recursive: true });
      } else {
        fs.copyFileSync(src, destPath);
      }
      logger.info(`📋 Copied: ${src} → ${destPath}`);
      this.eventBus.emit('file:copied', { src, dest: destPath });
      return `✅ Copied "${path.basename(src)}" to "${dest}"`;
    } catch (e) {
      return `❌ Copy failed: ${e.message}`;
    }
  }

  moveItem(src, dest) {
    try {
      if (!fs.existsSync(src)) return `❌ Source not found: ${src}`;
      const destPath = fs.existsSync(dest) && fs.statSync(dest).isDirectory()
        ? path.join(dest, path.basename(src)) : dest;
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.renameSync(src, destPath);
      logger.info(`📦 Moved: ${src} → ${destPath}`);
      this.eventBus.emit('file:moved', { src, dest: destPath });
      return `✅ Moved "${path.basename(src)}" to "${dest}"`;
    } catch (e) {
      // renameSync fails across drives — fallback to copy+delete
      try {
        this.copyItem(src, dest);
        fs.rmSync(src, { recursive: true, force: true });
        return `✅ Moved "${path.basename(src)}" to "${dest}"`;
      } catch (e2) {
        return `❌ Move failed: ${e2.message}`;
      }
    }
  }

  deleteItem(target) {
    try {
      if (!fs.existsSync(target)) return `❌ Not found: ${target}`;
      fs.rmSync(target, { recursive: true, force: true });
      logger.info(`🗑️ Deleted: ${target}`);
      this.eventBus.emit('file:deleted', { path: target });
      return `✅ Deleted: "${path.basename(target)}"`;
    } catch (e) {
      return `❌ Delete failed: ${e.message}`;
    }
  }

  listFiles(dir) {
    try {
      if (!fs.existsSync(dir)) return `❌ Directory not found: ${dir}`;
      const files = fs.readdirSync(dir).slice(0, 25);
      const labeled = files.map(f => {
        const full = path.join(dir, f);
        const isDir = fs.statSync(full).isDirectory();
        return `${isDir ? '📁' : '📄'} ${f}`;
      });
      return `📂 ${dir}:\n  ${labeled.join('\n  ')}`;
    } catch (e) { return `Cannot list: ${e.message}`; }
  }

  async searchFiles(query) {
    try {
      if (this.platform === 'win32') {
        const { stdout } = await execAsync(`dir /s /b "*${query}*" 2>nul`, { cwd: this.home, timeout: 5000 });
        const results = stdout.trim().split('\n').slice(0, 10);
        return results.length ? `🔍 Found:\n  ${results.join('\n  ')}` : `🔍 No results for "${query}"`;
      }
      return `🔍 Searching for "${query}"... Use File Explorer for full results.`;
    } catch (e) {
      return `🔍 No results for "${query}"`;
    }
  }

  async openFile(filePath) {
    try {
      if (this.platform === 'win32') exec(`start "" "${filePath}"`);
      else if (this.platform === 'darwin') exec(`open "${filePath}"`);
      else exec(`xdg-open "${filePath}"`);
      return `✅ Opened: ${path.basename(filePath)}`;
    } catch (e) { return `Cannot open: ${e.message}`; }
  }

  async organizeFiles(dir) {
    if (!fs.existsSync(dir)) return `Directory not found: ${dir}`;
    const cats = {
      Images:    ['.jpg','.jpeg','.png','.gif','.webp','.svg','.ico'],
      Documents: ['.pdf','.doc','.docx','.txt','.xlsx','.pptx','.csv'],
      Videos:    ['.mp4','.avi','.mkv','.mov','.wmv'],
      Music:     ['.mp3','.wav','.flac','.aac','.ogg'],
      Code:      ['.js','.py','.java','.cpp','.html','.css','.ts','.json'],
      Archives:  ['.zip','.rar','.7z','.tar','.gz'],
    };
    let moved = 0;
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) continue;
      const ext = path.extname(file).toLowerCase();
      let cat = 'Others';
      for (const [c, exts] of Object.entries(cats)) if (exts.includes(ext)) { cat = c; break; }
      const catDir = path.join(dir, cat);
      if (!fs.existsSync(catDir)) fs.mkdirSync(catDir);
      try { fs.renameSync(full, path.join(catDir, file)); moved++; } catch {}
    }
    return `✅ Organized ${moved} files into categories on Desktop.`;
  }

  _extractQuoted(cmd) {
    const m = cmd.match(/["']([^"']+)["']/);
    return m ? m[1] : null;
  }

  _extractPath(cmd) {
    const m = cmd.match(/(\S+\.\w+)/);
    return m ? m[1] : null;
  }
}

export default FileManager;
