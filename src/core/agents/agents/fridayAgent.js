import Agent from '../agent.js';

class FridayAgent extends Agent {
  constructor(eventBus, memory) {
    super('Friday', 'Daily assistant and productivity manager', eventBus, memory);
  }
}
export default FridayAgent;
