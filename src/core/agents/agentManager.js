import PrimeAgent    from './agents/primeAgent.js';
import FridayAgent   from './agents/fridayAgent.js';
import VeronicaAgent from './agents/veronicaAgent.js';
import ResearchAgent from './agents/researchAgent.js';
import StarkAgent    from './agents/starkAgent.js';
import SteveAgent    from './agents/steveAgent.js';
import OracleAgent   from './agents/oracleAgent.js';
import HeraldAgent   from './agents/heraldAgent.js';
import JeromeAgent   from './agents/jeromeAgent.js';
import AthenaAgent   from './agents/athenaAgent.js';
import PepperAgent   from './agents/pepperAgent.js';
import UltronAgent   from './agents/ultronAgent.js';
import HerculesAgent from './agents/herculesAgent.js';
import GeckoAgent    from './agents/geckoAgent.js';
import HulkAgent     from './agents/hulkAgent.js';
import logger from '../../utils/logger.js';
import llmService from '../llm/llmService.js';

class AgentManager {
  constructor(eventBus, memory) {
    this.eventBus = eventBus;
    this.memory = memory;
    this.agents = new Map();
    this.defaultAgent = null;
  }

  async initialize() {
    logger.info('🤖 Initializing All Agents...');
    const list = [
      ['prime',     new PrimeAgent(this.eventBus, this.memory)],
      ['friday',    new FridayAgent(this.eventBus, this.memory)],
      ['veronica',  new VeronicaAgent(this.eventBus, this.memory)],
      ['research',  new ResearchAgent(this.eventBus, this.memory)],
      ['stark',     new StarkAgent(this.eventBus, this.memory)],
      ['steve',     new SteveAgent(this.eventBus, this.memory)],
      ['oracle',    new OracleAgent(this.eventBus, this.memory)],
      ['herald',    new HeraldAgent(this.eventBus, this.memory)],
      ['jerome',    new JeromeAgent(this.eventBus, this.memory)],
      ['athena',    new AthenaAgent(this.eventBus, this.memory)],
      ['pepper',    new PepperAgent(this.eventBus, this.memory)],
      ['ultron',    new UltronAgent(this.eventBus, this.memory)],
      ['hercules',  new HerculesAgent(this.eventBus, this.memory)],
      ['gecko',     new GeckoAgent(this.eventBus, this.memory)],
      ['hulk',      new HulkAgent(this.eventBus, this.memory)],
    ];
    for (const [name, agent] of list) this.agents.set(name, agent);
    this.defaultAgent = this.agents.get('prime');
    logger.success(`✅ ${this.agents.size} agents online`);
  }

  selectAgent(command) {
    const cmd = command.toLowerCase();

    // ORDER MATTERS — more specific rules first
    const rules = [
      { keys: ['workout','exercise','fitness','calories','diet','water intake','gym','chest','leg day','pushup'], agent: 'hercules' },
      { keys: ['schedule','meeting','calendar','deadline','remind me','event','appointment'],                     agent: 'herald' },
      { keys: ['code','debug','program','function','fix bug','git','github','repository','compile'],              agent: 'steve' },
      { keys: ['research','search for','look up','find info','analyze','trend analysis'],                        agent: 'research' },
      { keys: ['social','post on','instagram','linkedin','tweet','caption','hashtag','dm'],                      agent: 'veronica' },
      { keys: ['music','spotify','playlist','song','next track','play music','pause music'],                     agent: 'jerome' },
      { keys: ['automate','workflow','pipeline','trigger','task queue','n8n'],                                   agent: 'oracle' },
      { keys: ['summary','productivity','daily','morning briefing','night report'],                              agent: 'friday' },
      { keys: ['strategy','plan','prioritize','timeline','objective','roadmap','milestones'],                    agent: 'athena' },
      { keys: ['business','analytics','revenue','startup','market share','roi','forecast'],                      agent: 'stark' },
      { keys: ['stress','tired','exhausted','emotional','burnout','motivat','how are you feeling'],              agent: 'pepper' },
      { keys: ['security','firewall','threat','virus','scan','malware','intrusion','network monitor'],           agent: 'ultron' },
      { keys: ['crypto','bitcoin','ethereum','stock','market','finance','portfolio','investment'],               agent: 'gecko' },
      { keys: ['offline','emergency','backup','diagnostics','recovery','low power','survival'],                  agent: 'hulk' },
    ];

    for (const rule of rules) {
      if (rule.keys.some(k => cmd.includes(k))) {
        const agent = this.agents.get(rule.agent);
        if (agent) {
          logger.info(`🎯 Routing to ${agent.name} agent`);
          return agent;
        }
      }
    }

    return this.defaultAgent;
  }

  async selectAgentDynamically(command) {
    const cmd = command.trim().toLowerCase();
    
    // Quick keyword scan as a fast-path fallback / optimizer
    const fastRules = [
      { keys: ['workout','exercise','gym','pushup','calories','diet'], agent: 'hercules' },
      { keys: ['schedule','meeting','calendar','appointment'], agent: 'herald' },
      { keys: ['code','debug','program','github','repository'], agent: 'steve' },
      { keys: ['spotify','playlist','song','play music'], agent: 'jerome' },
      { keys: ['crypto','bitcoin','ethereum','stock','portfolio'], agent: 'gecko' }
    ];
    for (const rule of fastRules) {
      if (rule.keys.some(k => cmd.includes(k))) {
        const agent = this.agents.get(rule.agent);
        if (agent) {
          logger.info(`⚡ Fast Routing: Match found for "${rule.agent}"`);
          return agent;
        }
      }
    }

    // Dynamic decision making via LLM
    const agentsList = Array.from(this.agents.entries())
      .filter(([name]) => name !== 'prime') // exclude prime orchestrator itself
      .map(([name, agent]) => `- ${name}: ${agent.description}`)
      .join('\n');

    const systemInstruction = `You are the Orchestration Brain of JARVIS. 
Your task is to classify a user command and determine which specialized agent is best suited to handle it.
Respond with ONLY the exact name of the selected agent from the list below, and nothing else. No explanation, no punctuation, just the single name in lowercase. If no specialized agent is a perfect match, or it is just general conversation, respond with "prime".

Available Agents:
${agentsList}`;

    try {
      const selectedName = await llmService.generateResponse(`Command: "${command}"`, systemInstruction);
      const cleanName = selectedName.trim().toLowerCase().replace(/[^a-z]/g, '');
      logger.info(`🧠 LLM Routing Decision: "${cleanName}" for query "${command}"`);
      const agent = this.agents.get(cleanName);
      if (agent) return agent;
    } catch (e) {
      logger.warn(`Failed to dynamically select agent: ${e.message}`);
    }

    return this.defaultAgent;
  }

  getAgent(name) { return this.agents.get(name.toLowerCase()); }

  getAllAgents() {
    return Array.from(this.agents.entries()).map(([key, agent]) => ({
      key,
      name: agent.name,
      description: agent.description,
      status: agent.getStatus()
    }));
  }
}

export default AgentManager;
