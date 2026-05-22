import llmService from '../llm/llmService.js';

class Agent {
  constructor(name, description, eventBus, memory) {
    this.name = name;
    this.description = description;
    this.eventBus = eventBus;
    this.memory = memory;
    this.isActive = true;
    this.taskCount = 0;
    this.successCount = 0;
    this.systemPrompt = `You are ${name}, JARVIS's ${description}. Keep your answers concise, practical, and in character.`;
  }

  async process(command) {
    try {
      this.taskCount++;
      const response = await this.execute(command);
      this.successCount++;
      return response;
    } catch (error) {
      return `Error in ${this.name}: ${error.message}`;
    }
  }

  async execute(command) {
    await this.logActivity('llm_process_command', { command });
    return await llmService.generateResponse(command, this.systemPrompt);
  }

  getStatus() {
    return {
      name: this.name,
      isActive: this.isActive,
      taskCount: this.taskCount,
      successRate: this.taskCount > 0
        ? (this.successCount / this.taskCount * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }

  async logActivity(action, details) {
    if (this.memory && this.memory.addActivity) {
      await this.memory.addActivity({
        agent: this.name,
        action,
        details,
        timestamp: new Date()
      });
    }
  }
}

export default Agent;
