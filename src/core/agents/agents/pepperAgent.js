import Agent from '../agent.js';

class PepperAgent extends Agent {
  constructor(eventBus, memory) {
    super('Pepper', 'Emotional intelligence and personal conversations', eventBus, memory);
  }
}
export default PepperAgent;
