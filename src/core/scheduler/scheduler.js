/**
 * JARVIS Reminder & Scheduler
 * Manages time-based reminders and smart alerts.
 */
import logger from '../../utils/logger.js';

class Scheduler {
  constructor(eventBus, ttsEngine) {
    this.eventBus = eventBus;
    this.ttsEngine = ttsEngine;
    this.reminders = [];
    this.intervals = [];
    this.idCounter = 1;
  }

  start() {
    const t = setInterval(() => this.checkReminders(), 30000);
    this.intervals.push(t);
    logger.info('⏰ Scheduler started');
  }

  async initialize() {
    this.start();
  }

  stop() {
    for (const i of this.intervals) clearInterval(i);
  }

  addReminder(message, time) {
    const fireAt = time instanceof Date ? time : new Date(Date.now() + time);
    const id = this.idCounter++;
    this.reminders.push({ id, message, fireAt, fired: false, recurring: false });
    logger.info(`⏰ Reminder #${id} → ${fireAt.toLocaleTimeString()}: "${message}"`);
    return id;
  }

  addRecurring(message, intervalMs) {
    const id = this.idCounter++;
    const t = setInterval(() => this.fire(message), intervalMs);
    this.intervals.push(t);
    this.reminders.push({ id, message, fireAt: `Every ${intervalMs/60000} mins`, fired: false, recurring: true });
    return id;
  }

  addInHours(message, hours) {
    return this.addReminder(message, hours * 3600000);
  }

  addDailyAt(message, hours, minutes) {
    const id = this.idCounter++;
    const t = setInterval(() => {
      const now = new Date();
      if (now.getHours() === hours && now.getMinutes() === minutes && now.getSeconds() < 30) {
        this.fire(message);
      }
    }, 30000);
    this.intervals.push(t);
    this.reminders.push({ id, message, fireAt: `Daily at ${hours}:${minutes < 10 ? '0'+minutes : minutes}`, fired: false, recurring: true });
    return id;
  }

  async checkReminders() {
    const now = new Date();
    for (const r of this.reminders) {
      if (!r.fired && r.fireAt <= now) {
        r.fired = true;
        await this.fire(r.message);
      }
    }
    this.reminders = this.reminders.filter(r => !r.fired);
  }

  async fire(message) {
    console.log(`\n\x1b[33m🔔 REMINDER: ${message}\x1b[0m\n`);
    if (this.ttsEngine) await this.ttsEngine.speak(`Reminder: ${message}`);
    if (this.eventBus) this.eventBus.emit('reminder:fired', { message });
  }

  listReminders() {
    const pending = this.reminders.filter(r => !r.fired);
    if (pending.length === 0) return 'No pending reminders.';
    return pending.map(r => `#${r.id} → "${r.message}" at ${r.fireAt instanceof Date ? r.fireAt.toLocaleTimeString() : r.fireAt}`).join('\n');
  }

  list() {
    return this.reminders.filter(r => !r.fired).map(r => ({
      ...r,
      fireAt: r.fireAt instanceof Date ? r.fireAt.toLocaleTimeString() : r.fireAt
    }));
  }

  parseNaturalReminder(command) {
    const lower = command.toLowerCase();
    const inMatch = lower.match(/in\s+(\d+)\s+(second|minute|hour)s?/);
    if (inMatch) {
      const n = parseInt(inMatch[1]);
      const unit = inMatch[2];
      const ms = unit === 'second' ? n * 1000 : unit === 'minute' ? n * 60000 : n * 3600000;
      const msgMatch = command.match(/to\s+(.+)$/i);
      return { ms, message: msgMatch ? msgMatch[1].trim() : 'Reminder!', recurring: false };
    }
    const everyMatch = lower.match(/every\s+(\d+)\s+(minute|hour)s?/);
    if (everyMatch) {
      const n = parseInt(everyMatch[1]);
      const unit = everyMatch[2];
      const ms = unit === 'minute' ? n * 60000 : n * 3600000;
      const msgMatch = command.match(/to\s+(.+)$/i);
      return { ms, message: msgMatch ? msgMatch[1].trim() : 'Reminder!', recurring: true };
    }
    return null;
  }

  handleReminderCommand(command) {
    const parsed = this.parseNaturalReminder(command);
    if (!parsed) return 'Try: "remind me in 10 minutes to drink water"';
    if (parsed.recurring) {
      const id = this.addRecurring(parsed.message, parsed.ms);
      return `🔁 Recurring reminder #${id} every ${parsed.ms / 60000}min: "${parsed.message}"`;
    }
    const id = this.addReminder(parsed.message, parsed.ms);
    const at = new Date(Date.now() + parsed.ms).toLocaleTimeString();
    return `⏰ Reminder #${id} at ${at}: "${parsed.message}"`;
  }

  parseCommand(command) {
    const parsed = this.parseNaturalReminder(command);
    if (!parsed) return null;
    if (parsed.recurring) {
      return this.addRecurring(parsed.message, parsed.ms);
    }
    return this.addReminder(parsed.message, parsed.ms);
  }
}

export default Scheduler;
