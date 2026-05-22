import Agent from '../agent.js';

class HeraldAgent extends Agent {
  constructor(eventBus, memory) {
    super('Herald', 'Calendar management and meeting coordination', eventBus, memory);
  }
}
export default HeraldAgent;
