import Agent from '../agent.js';

class UltronAgent extends Agent {
  constructor(eventBus, memory) {
    super('Ultron', 'Security monitoring and threat detection', eventBus, memory);
  }
}
export default UltronAgent;
