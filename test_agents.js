import Memory from './src/core/memory/memory.js';
import AgentManager from './src/core/agents/agentManager.js';

async function run() {
  // Mock event bus
  const eventBus = { on: () => {}, emit: () => {} };
  const memory = new Memory();
  const manager = new AgentManager(eventBus, memory);
  
  await manager.initialize();

  const tests = [
    "How are my crypto stocks doing?",
    "Tell me a joke about coding",
    "Play some lofi beats",
  ];

  for (const t of tests) {
    console.log(`\nUser: ${t}`);
    const agent = manager.selectAgent(t);
    const response = await agent.process(t);
    console.log(`${agent.name}: ${response}`);
  }
}

run().catch(console.error);
