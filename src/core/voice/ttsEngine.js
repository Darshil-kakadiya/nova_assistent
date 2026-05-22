import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

class TTSEngine {
  constructor() {
    this.platform = process.platform;
    this.voice = 'Microsoft David Desktop';
    this.rate = 0;
    this.volume = 100;
    this.isSpeaking = false;
    this.queue = [];
  }

  async initialize() {
    logger.info(`TTS Engine initializing on ${this.platform}`);
    if (this.platform === 'win32') {
      try {
        const { stdout } = await execAsync(
          `powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }"`,
          { timeout: 8000 }
        );
        const voices = stdout.trim().split('\n').map(v => v.trim()).filter(Boolean);
        if (voices.length > 0) {
          this.voice = voices.find(v => v.includes('David')) || voices[0];
          logger.success(`TTS voice: ${this.voice}`);
        }
      } catch (e) {
        logger.warn('Could not enumerate voices: ' + e.message);
      }
    }
  }

  async speak(text) {
    if (!text?.trim()) return;
    if (this.isSpeaking) { this.queue.push(text); return; }

    this.isSpeaking = true;
    console.log(`\n\x1b[32m🔊 JARVIS: ${text}\x1b[0m\n`);

    try {
      if (this.platform === 'win32') await this._win32(text);
      else if (this.platform === 'darwin') await this._mac(text);
      else await this._linux(text);
    } catch (e) {
      // console already printed above
    } finally {
      this.isSpeaking = false;
      if (this.queue.length) await this.speak(this.queue.shift());
    }
  }

  async _win32(text) {
    const safe = text.replace(/'/g, "''").replace(/[^\x00-\x7F]/g, '').substring(0, 400);
    const ps = `Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice('${this.voice}'); $s.Rate=${this.rate}; $s.Volume=${this.volume}; $s.Speak('${safe}');`;
    await execAsync(`powershell -Command "${ps}"`, { timeout: 25000 });
  }

  async _mac(text) {
    const safe = text.replace(/"/g, '\\"').substring(0, 400);
    await execAsync(`say "${safe}"`, { timeout: 25000 });
  }

  async _linux(text) {
    const safe = text.replace(/"/g, '\\"').substring(0, 400);
    try { await execAsync(`espeak "${safe}"`, { timeout: 25000 }); }
    catch { /* silent fallback */ }
  }
}

export default TTSEngine;
