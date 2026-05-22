import Agent from '../agent.js';

class VeronicaAgent extends Agent {
  constructor(eventBus, memory) {
    super('Veronica', 'Social media automation and communication', eventBus, memory);
  }
}
export default VeronicaAgent;
