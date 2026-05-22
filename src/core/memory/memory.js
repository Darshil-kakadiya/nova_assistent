import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class Memory {
  constructor() {
    this.dataDir = path.join(process.cwd(), '.jarvis-data');
    this.dataFile = path.join(this.dataDir, 'memory.json');
    this.conversations = [];
    this.activities = [];
    this.preferences = {};
  }

  async load() {
    try {
      if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        this.conversations = data.conversations || [];
        this.activities = data.activities || [];
        this.preferences = data.preferences || {};
        logger.success(`Loaded ${this.conversations.length} conversations from memory`);
      }
    } catch (e) {
      logger.warn('Could not load memory: ' + e.message);
    }
  }

  async save() {
    try {
      if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
      fs.writeFileSync(this.dataFile, JSON.stringify({
        conversations: this.conversations.slice(-500),
        activities: this.activities.slice(-1000),
        preferences: this.preferences,
        savedAt: new Date()
      }, null, 2));
    } catch (e) {
      logger.error('Memory save failed: ' + e.message);
    }
  }

  async addConversation(data) {
    this.conversations.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
    if (this.conversations.length % 20 === 0) await this.save();
  }

  async addActivity(data) {
    this.activities.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
  }

  getConversationHistory(limit = 50) {
    return this.conversations.slice(-limit);
  }

  getPreference(key, def = null) {
    return this.preferences[key] || def;
  }

  async setPreference(key, value) {
    this.preferences[key] = value;
    await this.save();
  }
}

export default Memory;
