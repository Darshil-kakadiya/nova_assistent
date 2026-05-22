import readline from 'readline';
import HindiSupport from './hindiSupport.js';
import logger from '../../utils/logger.js';

// Wake words and sleep words
const WAKE_WORDS  = ['hey jarvis', 'wake up jarvis', 'jarvis wake up', 'ok jarvis', 'yo jarvis', 'jarvis'];
const SLEEP_WORDS = ['go to sleep', 'goodbye jarvis', 'sleep mode', 'jarvis sleep', 'standby'];

class VoiceEngine {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isListening = false;
    this.isAwake = true;   // Always awake by default — no need to say "Hey Jarvis" first
    this.rl = null;
    this.hindi = new HindiSupport();
  }

  async initialize() {
    logger.info('Initializing Voice Engine...');

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    this.isListening = true;
    this._prompt();
  }

  _stripWakeWords(input) {
    let clean = input;
    for (const w of WAKE_WORDS) {
      clean = clean.replace(new RegExp('^' + w + '[,!]?\\s*', 'gi'), '');
    }
    return clean.trim();
  }

  _isSleepCommand(input) {
    const lower = input.toLowerCase().trim();
    return SLEEP_WORDS.some(w => lower === w || lower.startsWith(w));
  }

  _hasWakeWord(input) {
    const lower = input.toLowerCase().trim();
    return WAKE_WORDS.some(w => lower.startsWith(w));
  }

  _prompt() {
    if (!this.isListening || !this.rl) return;
    process.stdout.write('\nYou: ');

    this.rl.once('line', (input) => {
      if (!this.isListening) return;

      const raw = (input || '').trim();

      if (raw.toLowerCase() === 'exit' || raw.toLowerCase() === 'quit') {
        process.exit(0);
      }

      if (raw) {
        // Translate Hindi/Hinglish → English if needed
        let command = raw;
        if (this.hindi.isHindi(raw)) {
          command = this.hindi.translate(raw);
          logger.info(`🌐 Translated: "${raw}" → "${command}"`);
        }

        // Sleep command
        if (this._isSleepCommand(command)) {
          this.isAwake = false;
          console.log('\x1b[90m😴 JARVIS: Standing by...\x1b[0m');
          this.eventBus.emit('voice:sleeping');
          this._prompt();
          return;
        }

        // Wake word — strip prefix and continue
        if (this._hasWakeWord(command)) {
          this.isAwake = true;
          command = this._stripWakeWords(command);
          console.log('\x1b[36m🎯 JARVIS: I\'m listening...\x1b[0m');
          if (!command) {
            // Just "Hey Jarvis" with nothing after — wait for next line
            this.eventBus.emit('voice:wake-word-detected');
            this._prompt();
            return;
          }
        }

        // If awake, process the command (no wake word required)
        if (this.isAwake && command) {
          this.eventBus.emit('voice:command', command);
        } else if (!this.isAwake) {
          console.log('  (Say "Hey Jarvis" to wake me up, or just start typing!)');
        }
      }

      this._prompt();
    });
  }

  async stop() {
    this.isListening = false;
    if (this.rl) { this.rl.close(); this.rl = null; }
  }
}

export default VoiceEngine;
