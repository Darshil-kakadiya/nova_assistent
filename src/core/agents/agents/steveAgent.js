import Agent from '../agent.js';

class SteveAgent extends Agent {
  constructor(eventBus, memory) {
    super('Steve', 'Coding assistance and debugging', eventBus, memory);
  }
}
export default SteveAgent;
