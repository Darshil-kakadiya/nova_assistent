import Agent from '../agent.js';

class GeckoAgent extends Agent {
  constructor(eventBus, memory) {
    super('Gecko', 'Market tracking and crypto/finance analysis', eventBus, memory);
  }
}
export default GeckoAgent;
