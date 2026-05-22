import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

class SystemMonitor {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.platform = process.platform;
    this.interval = null;
  }

  async initialize() {
    logger.info('System Monitor ready');
    this.interval = setInterval(async () => {
      const stats = await this.getStats();
      this.eventBus.emit('system:stats', stats);
    }, 60000);
  }

  stopMonitoring() {
    if (this.interval) clearInterval(this.interval);
  }

  async getStats() {
    const ram = this.getRAM();
    return { ram, uptime: this.getUptime(), timestamp: new Date() };
  }

  getRAM() {
    const total = os.totalmem();
    const free = os.freemem();
    return {
      total: +(total / 1e9).toFixed(1),
      free: +(free / 1e9).toFixed(1),
      used: +((total - free) / 1e9).toFixed(1),
      percentage: Math.round((total - free) / total * 100)
    };
  }

  getUptime() {
    const u = os.uptime();
    return `${Math.floor(u / 3600)}h ${Math.floor((u % 3600) / 60)}m`;
  }

  async getSummary() {
    const ram = this.getRAM();
    const cpus = os.cpus();
    return `  CPU: ${cpus[0]?.model || 'Unknown'} (${cpus.length} cores)
  RAM: ${ram.used}GB / ${ram.total}GB (${ram.percentage}%)
  OS:  ${os.platform()} ${os.release()}
  Uptime: ${this.getUptime()}`;
  }
}

export default SystemMonitor;
