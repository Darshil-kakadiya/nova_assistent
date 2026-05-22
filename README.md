# 🤖 JARVIS AI Assistant

A powerful AI assistant with PC control, voice commands, and multi-agent system inspired by Iron Man's JARVIS.

## 🌟 Features

### Core AI System
- Natural conversation with context awareness
- Multi-agent orchestration system
- Real-time thinking and autonomous execution
- Persistent memory system
- Event-driven architecture

### Voice Features
- Voice command recognition
- Text-to-speech output (Windows, Mac, Linux)
- Natural language understanding
- Real-time speech processing

### PC Control
- Open/close applications
- Volume and brightness control
- Screenshot capture
- System control (shutdown, restart, sleep)
- File management
- Media control

### Multi-Agent System
- **Prime Agent**: Main orchestrator
- **Friday Agent**: Daily productivity assistant
- **Veronica Agent**: Social media automation
- **Research Agent**: Deep research and analysis
- **Stark Agent**: Business intelligence
- **Steve Agent**: Coding assistance
- **Oracle Agent**: Workflow automation
- **Herald Agent**: Calendar management
- **Jerome Agent**: Music and entertainment

## 📋 Requirements

- Node.js 14+ 
- npm or yarn
- Windows/Mac/Linux
- 2GB RAM minimum
- Internet connection (optional, for API features)

## 🚀 Installation

### 1. Extract the Project
```bash
unzip jarvis-ai-assistant.zip
cd jarvis-ai-assistant
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configuration
Edit `.env` file to customize settings:
```bash
VOICE_ENABLED=true
PC_CONTROL_ENABLED=true
DEBUG=false
```

### 4. Start JARVIS
```bash
npm start
```

Or with auto-reload during development:
```bash
npm run dev
```

## 💬 Voice Commands

### Help & Info
- `help` - Show all available commands
- `status` - System status
- `who are you` - About JARVIS
- `what can you do` - Feature list

### PC Control
- `open chrome` - Open an application
- `close notepad` - Close an application
- `screenshot` - Take a screenshot
- `volume up/down/mute` - Control volume
- `brightness 50` - Set brightness to 50%
- `shutdown` - Shutdown system (after 30s)
- `restart` - Restart system
- `sleep` - Put system to sleep

### Productivity
- `schedule meeting` - Schedule a meeting
- `show calendar` - Display calendar
- `today summary` - Daily summary
- `productivity` - Productivity analysis
- `set reminder` - Create a reminder

### Entertainment
- `play music` - Start music
- `next song` - Skip to next song
- `pause` - Pause music
- `create playlist` - Create a new playlist

### Coding
- `debug` - Get debugging help
- `write code` - Code generation
- `optimize code` - Code optimization
- `run tests` - Test suite status

### Business
- `show analytics` - Analytics dashboard
- `market analysis` - Market insights
- `revenue forecast` - Revenue projection

### Research
- `search for [topic]` - Web search
- `summarize` - Summarize content
- `analyze` - Analyze data
- `trends` - Current trends

### Social Media
- `post on linkedin` - Social media posting
- `create caption` - Caption generation
- `schedule post` - Schedule posts

## 🏗️ Project Structure

```
jarvis-ai-assistant/
├── src/
│   ├── index.js                 # Main entry point
│   ├── core/
│   │   ├── jarvis.js           # Main orchestrator
│   │   ├── voice/
│   │   │   └── voiceEngine.js  # Voice I/O
│   │   ├── pc-control/
│   │   │   └── pcController.js # PC automation
│   │   ├── agents/
│   │   │   ├── agentManager.js # Agent coordination
│   │   │   ├── agent.js        # Base agent class
│   │   │   └── agents/         # Individual agents
│   │   ├── conversation/
│   │   │   └── conversationEngine.js
│   │   ├── memory/
│   │   │   └── memory.js       # Persistent memory
│   │   └── event-bus/
│   │       └── eventBus.js     # Event system
│   └── utils/
│       └── logger.js           # Logging utility
├── package.json
├── .env
└── README.md
```

## 🔧 Configuration

### Voice Settings
```javascript
// In .env
VOICE_ENABLED=true
TTS_ENGINE=native
RECOGNITION_LANGUAGE=en-US
```

### PC Control Settings
```javascript
PC_CONTROL_ENABLED=true
ALLOW_SYSTEM_COMMANDS=true
```

### Agent Configuration
```javascript
AGENT_TIMEOUT=30000
MAX_CONCURRENT_AGENTS=5
```

## 📖 Usage Examples

### Example 1: Simple Command
```
You: open chrome
JARVIS: 📂 Opening chrome...
(Chrome opens)
```

### Example 2: Complex Workflow
```
You: search for nodejs best practices
JARVIS: Searching for information about nodejs best practices... 
        Found 2,340 results...
(Research Agent processes your request)
```

### Example 3: PC Control
```
You: take screenshot and save it
JARVIS: 📸 Taking screenshot...
        Screenshot saved: screenshot_1234567890.png
```

### Example 4: Multi-Agent Coordination
```
You: schedule a meeting and post about it
JARVIS: [Herald Agent] Meeting scheduled for tomorrow at 2 PM
        [Veronica Agent] Creating social media caption...
```

## 🔐 Security & Safety

⚠️ **Important Security Notes:**
1. Requires explicit voice confirmation for system-level commands (shutdown, restart)
2. All commands are logged for audit purposes
3. PC control can be disabled in `.env`
4. Memory is stored locally, never sent to external servers
5. No personal data collection without consent

## 🐛 Troubleshooting

### Voice Not Working
- Check if your system has text-to-speech capability
- On Windows: Ensure you have Speech Platform installed
- On Mac: Should work natively with `say` command
- On Linux: Install `espeak`: `sudo apt-get install espeak`

### PC Control Not Working
- Ensure PC_CONTROL_ENABLED=true in .env
- Run with appropriate permissions (may need admin)
- Check if target application exists

### Memory Not Saving
- Ensure write permissions in project directory
- Check `.jarvis-data` folder exists
- Review logs in `.jarvis-logs`

### Agent Not Responding
- Check AGENT_TIMEOUT in .env
- Ensure event bus is initialized
- Review system logs

## 📊 Performance

- Memory usage: ~50-100MB idle
- CPU usage: <5% idle, ~15% during processing
- Response time: 1-3 seconds for most commands
- Supports 100+ concurrent agents

## 🔄 Updating

To update to the latest version:
```bash
git pull origin main
npm install
npm start
```

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Additional agents
- Enhanced voice recognition
- GUI dashboard
- API extensions
- Cloud integration

## 📝 License

MIT License - Feel free to use in personal or commercial projects

## 🚀 Future Features

- AR/VR integration
- Smart home control
- AI self-improvement
- Advanced NLP
- Multi-language support
- Cloud synchronization
- Mobile app integration
- Advanced analytics

## 💡 Tips & Tricks

1. **Custom Agents**: Create your own agent by extending the Agent class
2. **Voice Profiles**: Store different voice preferences
3. **Workflow Automation**: Chain commands together
4. **Memory Search**: Use `search [query]` to find past conversations
5. **Agent Status**: Type `status` to see all agent performance metrics

## 🎯 Best Practices

1. Speak clearly for better recognition
2. Use specific commands: "open chrome" not just "open"
3. Check system logs if something goes wrong
4. Keep `.env` file updated
5. Regular backups of memory data
6. Review memory usage periodically

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review system logs in `.jarvis-logs`
3. Create an issue on GitHub
4. Check documentation at https://jarvis-ai.dev

## 🌟 Star History

If you find JARVIS helpful, please star this project!

---

**Made with ❤️ - JARVIS AI Assistant v1.0.0**
