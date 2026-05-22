import Agent from '../agent.js';

class HerculesAgent extends Agent {
  constructor(eventBus, memory) {
    super('Hercules', 'Fitness, health tracking and workout planning', eventBus, memory);
  }
}
export default HerculesAgent;
