import Agent from '../agent.js';

class AthenaAgent extends Agent {
  constructor(eventBus, memory) {
    super('Athena', 'Planning, strategy, and workload prediction', eventBus, memory);
  }
}
export default AthenaAgent;
