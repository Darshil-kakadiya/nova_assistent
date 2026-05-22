/**
 * JARVIS Website Builder
 * Generates a complete website using LLM and opens it in the browser.
 */
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import os from 'os';
import llmService from '../llm/llmService.js';
import logger from '../../utils/logger.js';

class WebsiteBuilder {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  async initialize() {
    logger.info('🌐 Website Builder ready');
  }

  /**
   * Detect and handle website build commands.
   * Returns null if command doesn't match.
   */
  matchCommand(command) {
    const cmd = command.toLowerCase();
    const patterns = [
      /(?:make|create|build)\s+(?:a\s+)?(?:new\s+)?(?:folder|directory)\s+(?:called\s+|named\s+)?["']?([\w\s-]+?)["']?\s+(?:and\s+)?(?:(?:make|create|build)\s+(?:a\s+)?(?:complete\s+)?(?:website|web\s+app|webpage))/i,
      /(?:make|create|build)\s+(?:a\s+)?(?:complete\s+)?(?:website|web\s+app|webpage)\s+(?:in|inside|at)\s+(?:folder\s+)?["']?([\w\s-]+?)["']?$/i,
      /(?:make|create|build)\s+(?:a\s+)?(?:complete\s+)?(?:website|web\s+app|webpage)\s+(?:called\s+|named\s+)?["']?([\w\s-]+?)["']?/i,
    ];

    for (const p of patterns) {
      const m = command.match(p);
      if (m) return m[1]?.trim() || 'my-website';
    }
    return null;
  }

  async build(folderName, description) {
    const sanitized = folderName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '-');
    const targetDir = path.join(os.homedir(), 'Desktop', sanitized);

    // Create the folder
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      logger.info(`📁 Created folder: ${targetDir}`);
    }

    const siteDesc = description || `A premium, modern website called "${sanitized}" with a beautiful UI, dark mode, smooth animations, navigation header, hero section, features section, and footer.`;

    logger.info(`🌐 Generating website for: ${sanitized}...`);

    // Generate HTML
    const htmlPrompt = `Generate a complete, self-contained, stunning HTML file for: ${siteDesc}
RULES:
- Include ALL CSS inline in a <style> tag (no external CSS files)
- Include ALL JavaScript inline in a <script> tag  
- Use modern design: dark mode, gradients, animations, Google Fonts (Inter or Outfit)
- Include: navigation, hero section, features/about section, footer
- Make it look PREMIUM and professional
- No placeholders — fill in all content with realistic text
- Must be valid HTML5
Output ONLY the raw HTML code, no markdown, no explanation.`;

    const htmlCode = await llmService.generateResponse(htmlPrompt, 'You are an expert web developer. Generate only clean, valid, self-contained HTML code with embedded CSS and JS. No markdown. No explanation. Just the HTML.');

    // Clean up any markdown code fences if LLM added them
    const cleanHtml = htmlCode.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

    // Write files
    const htmlPath = path.join(targetDir, 'index.html');
    fs.writeFileSync(htmlPath, cleanHtml, 'utf-8');

    // Auto-open in browser
    if (process.platform === 'win32') {
      exec(`start "" "${htmlPath}"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${htmlPath}"`);
    } else {
      exec(`xdg-open "${htmlPath}"`);
    }

    logger.info(`✅ Website built and opened: ${htmlPath}`);
    this.eventBus.emit('website:built', { folder: targetDir, file: htmlPath });

    return `✅ Website created in "${sanitized}" on your Desktop!\n📂 Path: ${targetDir}\n🌐 Opened in browser — ready to view!`;
  }
}

export default WebsiteBuilder;
