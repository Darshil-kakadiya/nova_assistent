/**
 * JARVIS Plugin System
 * Load custom plugins from the /plugins directory.
 * Each plugin exports: { name, description, keywords, execute(command, context) }
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import logger from '../../utils/logger.js';

class PluginManager {
  constructor(eventBus, memory) {
    this.eventBus = eventBus;
    this.memory = memory;
    this.plugins = new Map();
    this.pluginsDir = path.join(process.cwd(), 'plugins');
  }

  async initialize() {
    logger.info('🔌 Plugin Manager initializing...');
    this._ensurePluginsDir();
    await this._loadPlugins();
    logger.success(`✅ ${this.plugins.size} plugins loaded`);
  }

  _ensurePluginsDir() {
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
      // Write an example plugin
      const example = `// JARVIS Example Plugin
// File: plugins/example-plugin.js
const plugin = {
  name: 'Example',
  description: 'A sample plugin that responds to "hello plugin"',
  keywords: ['hello plugin', 'example plugin'],
  async execute(command, context) {
    return 'Hello from the Example Plugin! 🎉';
  }
};
export default plugin;
`;
      fs.writeFileSync(path.join(this.pluginsDir, 'example-plugin.js'), example);
      logger.info('📝 Created example plugin in /plugins directory');
    }
  }

  async _loadPlugins() {
    try {
      const files = fs.readdirSync(this.pluginsDir)
        .filter(f => f.endsWith('.js') && !f.startsWith('_'));

      for (const file of files) {
        try {
          const fileUrl = pathToFileURL(path.join(this.pluginsDir, file)).href;
          const mod = await import(fileUrl);
          const plugin = mod.default || mod;
          if (plugin?.name && plugin?.execute) {
            this.plugins.set(plugin.name.toLowerCase(), plugin);
            logger.info(`  🔌 Loaded plugin: ${plugin.name}`);
          }
        } catch (e) {
          logger.warn(`  ⚠️ Could not load plugin ${file}: ${e.message}`);
        }
      }
    } catch (e) {
      logger.warn('Plugin load error: ' + e.message);
    }
  }

  matchPlugin(command) {
    const cmd = command.toLowerCase();
    for (const [, plugin] of this.plugins) {
      const keywords = plugin.keywords || [];
      if (keywords.some(k => cmd.includes(k.toLowerCase()))) {
        return plugin;
      }
    }
    return null;
  }

  async execute(command) {
    const plugin = this.matchPlugin(command);
    if (!plugin) return null;
    try {
      logger.info(`🔌 Running plugin: ${plugin.name}`);
      return await plugin.execute(command, { eventBus: this.eventBus, memory: this.memory });
    } catch (e) {
      return `Plugin error (${plugin.name}): ${e.message}`;
    }
  }

  list() {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.name,
      description: p.description,
      keywords: p.keywords,
    }));
  }

  reload() {
    this.plugins.clear();
    return this._loadPlugins();
  }
}

export default PluginManager;
