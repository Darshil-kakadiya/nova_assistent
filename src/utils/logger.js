import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
};

class Logger {
  constructor() {
    this.logsDir = path.join(process.cwd(), '.jarvis-logs');
    this.ensureDir();
  }

  ensureDir() {
    try {
      if (!fs.existsSync(this.logsDir)) fs.mkdirSync(this.logsDir, { recursive: true });
    } catch (e) {}
  }

  _log(color, prefix, message) {
    console.log(`${color}${prefix}${colors.reset} ${message}`);
    this._write(prefix, message);
  }

  _write(level, message) {
    try {
      const ts = new Date().toISOString();
      const file = path.join(this.logsDir, `${ts.split('T')[0]}.log`);
      fs.appendFileSync(file, `[${ts}] [${level}] ${message}\n`);
    } catch (e) {}
  }

  info(msg)          { this._log(colors.blue,   'INFO   ', msg); }
  success(msg)       { this._log(colors.green,  'OK     ', msg); }
  warn(msg)          { this._log(colors.yellow, 'WARN   ', msg); }
  error(msg, err='') { this._log(colors.red,    'ERROR  ', msg + (err ? ' ' + err : '')); }
  debug(msg)         { if (process.env.DEBUG === 'true') this._log(colors.gray, 'DEBUG  ', msg); }
}

export default new Logger();
