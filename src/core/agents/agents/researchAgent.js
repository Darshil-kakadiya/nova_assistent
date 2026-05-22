import Agent from '../agent.js';

class ResearchAgent extends Agent {
  constructor(eventBus, memory) {
    super('Research', 'Deep research, analysis, and information gathering', eventBus, memory);
  }
}
export default ResearchAgent;
