import Agent from '../agent.js';

class JeromeAgent extends Agent {
  constructor(eventBus, memory) {
    super('Jerome', 'Music and entertainment control', eventBus, memory);
  }
}
export default JeromeAgent;
