import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

class PCController {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.platform = process.platform;
  }

  async initialize() {
    logger.info(`PC Controller ready on ${this.platform}`);
  }

  async processCommand(command) {
    const cmd = command.toLowerCase();

    if (cmd.includes('screenshot')) return await this.takeScreenshot();
    if (cmd.includes('volume')) return await this.controlVolume(cmd);
    if (cmd.includes('brightness')) return await this.controlBrightness(cmd);
    if (cmd.includes('shutdown')) return await this.systemControl('shutdown');
    if (cmd.includes('restart')) return await this.systemControl('restart');
    if (cmd.includes('sleep')) return await this.systemControl('sleep');
    if (cmd.includes('mute')) return await this.controlVolume('mute');

    return null;
  }

  async takeScreenshot() {
    try {
      logger.info('📸 Taking screenshot...');
      const now = new Date();
      const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `JARVIS_screenshot_${ts}.png`;

      // Ensure Pictures\Screenshots folder exists
      const { default: os } = await import('os');
      const { default: path } = await import('path');
      const screenshotDir = path.join(os.homedir(), 'Pictures', 'Screenshots');
      const { default: fs } = await import('fs');
      if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

      const filePath = path.join(screenshotDir, filename).replace(/\\/g, '\\\\');

      if (this.platform === 'win32') {
        await execAsync(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $screen=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp=New-Object System.Drawing.Bitmap($screen.Width,$screen.Height); $g=[System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($screen.Location,[System.Drawing.Point]::Empty,$screen.Size); $bmp.Save('${filePath}'); $g.Dispose(); $bmp.Dispose()"`, { timeout: 15000 });
      } else if (this.platform === 'darwin') {
        const { default: p } = await import('path');
        const fullPath = p.join(screenshotDir, filename);
        await execAsync(`screencapture "${fullPath}"`);
      }
      return `✅ Screenshot saved to Pictures\\Screenshots\\${filename}`;
    } catch (e) {
      logger.warn('Screenshot error: ' + e.message);
      return '⚠️ Screenshot attempted. Check Pictures\\Screenshots folder.';
    }
  }

  async controlVolume(cmd) {
    try {
      if (this.platform === 'win32') {
        if (cmd.includes('mute')) {
          await execAsync(`powershell -Command "(New-Object -com WScript.Shell).SendKeys([char]173)"`);
          return '🔇 Muted';
        }
        if (cmd.includes('up')) {
          await execAsync(`powershell -Command "1..5 | ForEach-Object { (New-Object -com WScript.Shell).SendKeys([char]175) }"`);
          return '🔊 Volume increased';
        }
        if (cmd.includes('down')) {
          await execAsync(`powershell -Command "1..5 | ForEach-Object { (New-Object -com WScript.Shell).SendKeys([char]174) }"`);
          return '🔉 Volume decreased';
        }
      }
      return '🔊 Volume command executed';
    } catch (e) {
      return '⚠️ Volume control: ' + e.message;
    }
  }

  async controlBrightness(cmd) {
    try {
      const match = cmd.match(/\d+/);
      const level = match ? parseInt(match[0]) : 50;
      if (this.platform === 'win32') {
        await execAsync(`powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${level})"`, { timeout: 5000 });
      }
      return `💡 Brightness set to ${level}%`;
    } catch (e) {
      return `⚠️ Brightness: ${e.message}`;
    }
  }

  async systemControl(action) {
    try {
      if (action === 'shutdown') {
        logger.warn('⚠️ Shutdown in 30s. Type "cancel shutdown" to abort.');
        if (this.platform === 'win32') exec('shutdown /s /t 30');
        return '⚠️ System shutting down in 30 seconds!';
      }
      if (action === 'restart') {
        if (this.platform === 'win32') exec('shutdown /r /t 30');
        return '⚠️ System restarting in 30 seconds!';
      }
      if (action === 'sleep') {
        if (this.platform === 'win32') exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
        return '😴 Going to sleep...';
      }
    } catch (e) {
      return `System command failed: ${e.message}`;
    }
  }

  async executeAction(action) {
    logger.info(`Executing action: ${JSON.stringify(action)}`);
  }
}

export default PCController;
