import Agent from '../agent.js';

class OracleAgent extends Agent {
  constructor(eventBus, memory) {
    super('Oracle', 'Workflow automation and task pipelines', eventBus, memory);
  }
}
export default OracleAgent;
