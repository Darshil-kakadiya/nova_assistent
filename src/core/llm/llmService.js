/**
 * JARVIS LLM Service — Multi-provider support with conversation history.
 * Providers: Google Gemini, Groq, OpenRouter, OpenAI
 */
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import logger from '../../utils/logger.js';
import dotenv from 'dotenv';
dotenv.config();

class LLMService {
  constructor() {
    this.gemini = null;
    this.openaiClient = null;
    this.groqClient = null;
    this.openRouterClient = null;
    this.conversationHistory = []; // For natural multi-turn conversation

    if (process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      logger.info('🧠 LLM Provider configured: Google Gemini');
    }
    if (process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      logger.info('🧠 LLM Provider configured: OpenAI');
    }
    if (process.env.GROQ_API_KEY) {
      this.groqClient = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
      logger.info('🧠 LLM Provider configured: Groq');
    }
    if (process.env.OPENROUTER_API_KEY) {
      this.openRouterClient = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1' });
      logger.info('🧠 LLM Provider configured: OpenRouter');
    }

    // Priority: OpenRouter → Groq → Gemini → OpenAI
    this.defaultProvider = this.openRouterClient ? 'openrouter'
      : this.groqClient ? 'groq'
      : this.gemini ? 'gemini'
      : this.openaiClient ? 'openai'
      : null;

    if (!this.defaultProvider) {
      logger.warn('⚠️ No LLM API Keys found in .env. Dynamic responses will fail.');
    } else {
      logger.info(`✨ Active LLM Provider: ${this.defaultProvider.toUpperCase()}`);
    }
  }

  /**
   * Generate a single one-shot response (no history tracking).
   * Used by agents and the website builder.
   */
  async generateResponse(prompt, systemInstruction) {
    if (!this.defaultProvider) {
      return 'System error: No LLM API keys configured.';
    }
    try {
      if (this.defaultProvider === 'gemini') {
        const response = await this.gemini.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { systemInstruction, maxOutputTokens: 500 }
        });
        return response.text;
      }

      const { client, model } = this._getClient();
      const response = await client.chat.completions.create({
        model,
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ]
      });
      return response.choices[0].message.content;
    } catch (e) {
      logger.warn('LLM Generation Error: ' + e.message);
      return `I encountered an error: ${e.message}`;
    }
  }

  /**
   * Natural conversation — keeps full multi-turn history, JARVIS persona.
   */
  async chat(userMessage) {
    if (!this.defaultProvider) {
      return 'No LLM API keys configured. Please add one to your .env file.';
    }

    const systemPrompt = `You are JARVIS — Just A Rather Very Intelligent System. You are an advanced, witty, highly capable AI assistant with a slightly formal yet warm British persona (like the real JARVIS from Iron Man). You assist with PC control, information, tasks, and general conversation. Keep responses concise and helpful. Do NOT generate code or HTML in this mode unless explicitly asked.`;

    // Append user message to history
    this.conversationHistory.push({ role: 'user', content: userMessage });

    // Keep history to last 20 messages to avoid token overflow
    const trimmed = this.conversationHistory.slice(-20);

    try {
      let reply = '';

      if (this.defaultProvider === 'gemini') {
        // Build a flat conversation string for Gemini's simple API
        const convoString = trimmed.map(m => `${m.role === 'user' ? 'User' : 'JARVIS'}: ${m.content}`).join('\n');
        const response = await this.gemini.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: convoString + '\nJARVIS:',
          config: { systemInstruction: systemPrompt, maxOutputTokens: 500 }
        });
        reply = response.text;
      } else {
        const { client, model } = this._getClient();
        const response = await client.chat.completions.create({
          model,
          max_tokens: 500,
          messages: [
            { role: 'system', content: systemPrompt },
            ...trimmed
          ]
        });
        reply = response.choices[0].message.content;
      }

      // Store reply in history
      this.conversationHistory.push({ role: 'assistant', content: reply });
      return reply;

    } catch (e) {
      logger.warn('LLM Chat Error: ' + e.message);
      return `I'm having trouble connecting to my core intelligence right now. ${e.message}`;
    }
  }

  /** Clear conversation history (e.g., on "new conversation" command) */
  clearHistory() {
    this.conversationHistory = [];
    return 'Conversation history cleared. Starting fresh.';
  }

  _getClient() {
    if (this.defaultProvider === 'groq') return { client: this.groqClient, model: 'llama3-8b-8192' };
    if (this.defaultProvider === 'openrouter') return { client: this.openRouterClient, model: 'google/gemini-2.5-flash' };
    if (this.defaultProvider === 'openai') return { client: this.openaiClient, model: 'gpt-4o-mini' };
    return null;
  }
}

export default new LLMService();
