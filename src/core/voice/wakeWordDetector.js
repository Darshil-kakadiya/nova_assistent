class WakeWordDetector {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isAwake = true; // Start awake
    this.sleepTimeout = null;
    this.sleepDelay = 5 * 60 * 1000;

    this.wakeWords = ['hey jarvis','wake up jarvis','jarvis wake up','ok jarvis','yo jarvis','jarvis'];
    this.sleepWords = ['go to sleep','goodbye jarvis','sleep mode','jarvis sleep','standby'];
  }

  checkWake(input) {
    const lower = input.toLowerCase().trim();
    return this.wakeWords.some(w => lower.includes(w));
  }

  checkSleep(input) {
    const lower = input.toLowerCase().trim();
    return this.sleepWords.some(w => lower.includes(w));
  }

  stripWakeWord(input) {
    let clean = input;
    for (const w of this.wakeWords) {
      clean = clean.replace(new RegExp(w, 'gi'), '').trim();
    }
    return clean;
  }

  activate() {
    this.isAwake = true;
    this.resetSleepTimer();
    if (this.eventBus) this.eventBus.emit('wakeword:activated', {});
    console.log('\x1b[36m🎯 JARVIS: I\'m listening...\x1b[0m');
  }

  deactivate() {
    this.isAwake = false;
    if (this.sleepTimeout) clearTimeout(this.sleepTimeout);
    if (this.eventBus) this.eventBus.emit('wakeword:deactivated', {});
    console.log('\x1b[90m😴 JARVIS: Standing by...\x1b[0m');
  }

  resetSleepTimer() {
    if (this.sleepTimeout) clearTimeout(this.sleepTimeout);
    this.sleepTimeout = setTimeout(() => this.deactivate(), this.sleepDelay);
  }

  process(input) {
    if (this.checkSleep(input)) { this.deactivate(); return { action: 'sleep', command: null }; }
    if (this.checkWake(input)) {
      this.activate();
      const cmd = this.stripWakeWord(input);
      return { action: 'wake', command: cmd || null };
    }
    if (this.isAwake) { this.resetSleepTimer(); return { action: 'command', command: input }; }
    return { action: 'ignore', command: null };
  }
}

export default WakeWordDetector;
