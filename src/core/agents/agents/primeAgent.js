import Agent from '../agent.js';

class PrimeAgent extends Agent {
  constructor(eventBus, memory) {
    super('Prime', 'Main orchestrator and decision maker', eventBus, memory);
  }
}
export default PrimeAgent;
