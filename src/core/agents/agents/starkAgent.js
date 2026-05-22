import Agent from '../agent.js';

class StarkAgent extends Agent {
  constructor(eventBus, memory) {
    super('Stark', 'Business intelligence and startup insights', eventBus, memory);
  }
}
export default StarkAgent;
