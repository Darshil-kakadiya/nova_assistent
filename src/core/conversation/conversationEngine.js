import logger from '../../utils/logger.js';

class ConversationEngine {
  constructor(eventBus, memory) {
    this.eventBus = eventBus;
    this.memory = memory;
    this.history = [];
  }

  async initialize() {
    logger.info('Conversation Engine ready');
  }

  addToHistory(command, response, agentName) {
    this.history.push({ command, response, agentName, timestamp: new Date() });
    if (this.history.length > 100) this.history.shift();
  }

  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }
}

export default ConversationEngine;
