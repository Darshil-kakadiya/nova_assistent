// JARVIS Example Plugin
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
