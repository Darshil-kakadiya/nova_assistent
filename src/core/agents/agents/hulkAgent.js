import Agent from '../agent.js';

class HulkAgent extends Agent {
  constructor(eventBus, memory) {
    super('Hulk', 'Offline survival mode and emergency AI', eventBus, memory);
  }
}
export default HulkAgent;
