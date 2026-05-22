import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("jarvis")

class LLMService:
    def __init__(self):
        self.gemini_client = None
        self.openai_client = None
        self.groq_client = None
        self.openrouter_client = None
        self.conversation_history = []
        self.default_provider = None

        gemini_key = os.getenv("GEMINI_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")
        groq_key = os.getenv("GROQ_API_KEY")
        openrouter_key = os.getenv("OPENROUTER_API_KEY")

        # Configure Google GenAI
        if gemini_key:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=gemini_key)
                logger.info("🧠 LLM Provider configured: Google Gemini")
            except Exception as e:
                logger.warning(f"⚠️ Failed to import google-genai: {e}")

        # Configure OpenAI
        if openai_key:
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=openai_key)
                logger.info("🧠 LLM Provider configured: OpenAI")
            except Exception as e:
                logger.warning(f"⚠️ Failed to configure OpenAI: {e}")

        # Configure Groq
        if groq_key:
            try:
                from openai import OpenAI
                self.groq_client = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
                logger.info("🧠 LLM Provider configured: Groq")
            except Exception as e:
                logger.warning(f"⚠️ Failed to configure Groq: {e}")

        # Configure OpenRouter
        if openrouter_key:
            try:
                from openai import OpenAI
                self.openrouter_client = OpenAI(api_key=openrouter_key, base_url="https://openrouter.ai/api/v1")
                logger.info("🧠 LLM Provider configured: OpenRouter")
            except Exception as e:
                logger.warning(f"⚠️ Failed to configure OpenRouter: {e}")

        # Priority: OpenRouter -> Groq -> Gemini -> OpenAI
        if self.openrouter_client:
            self.default_provider = "openrouter"
        elif self.groq_client:
            self.default_provider = "groq"
        elif self.gemini_client:
            self.default_provider = "gemini"
        elif self.openai_client:
            self.default_provider = "openai"

        if not self.default_provider:
            logger.warning("⚠️ No LLM API Keys found. AI actions will fail.")
        else:
            logger.info(f"✨ Active LLM Provider: {self.default_provider.upper()}")

    def generate_response(self, prompt: str, system_instruction: str) -> str:
        if not self.default_provider:
            return "System error: No LLM API keys configured."

        try:
            if self.default_provider == "gemini":
                # For python google-genai:
                from google.genai import types
                response = self.gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        max_output_tokens=500
                    )
                )
                return response.text

            client, model = self._get_client_and_model()
            if not client:
                return "LLM configuration error: selected client unavailable."

            response = client.chat.completions.create(
                model=model,
                max_tokens=500,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ]
            )
            return response.choices[0].message.content

        except Exception as e:
            logger.warning(f"LLM Generation Error: {e}")
            return f"I encountered an error: {str(e)}"

    def chat(self, user_message: str) -> str:
        if not self.default_provider:
            return "No LLM API keys configured. Please add one to your .env file."

        system_prompt = (
            "You are JARVIS — Just A Rather Very Intelligent System. You are an advanced, "
            "witty, highly capable AI assistant with a slightly formal yet warm British persona "
            "(like the real JARVIS from Iron Man). You assist with PC control, information, tasks, "
            "and general conversation. Keep responses concise and helpful. Do NOT generate code "
            "or HTML in this mode unless explicitly asked."
        )

        self.conversation_history.append({"role": "user", "content": user_message})
        # Keep last 20 messages
        trimmed_history = self.conversation_history[-20:]

        try:
            reply = ""
            if self.default_provider == "gemini":
                # Flatten the messages for Gemini text prompt
                convo_string = "\n".join([f"{'User' if m['role'] == 'user' else 'JARVIS'}: {m['content']}" for m in trimmed_history])
                from google.genai import types
                response = self.gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=convo_string + "\nJARVIS:",
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        max_output_tokens=500
                    )
                )
                reply = response.text
            else:
                client, model = self._get_client_and_model()
                messages = [{"role": "system", "content": system_prompt}] + trimmed_history
                response = client.chat.completions.create(
                    model=model,
                    max_tokens=500,
                    messages=messages
                )
                reply = response.choices[0].message.content

            self.conversation_history.append({"role": "assistant", "content": reply})
            return reply

        except Exception as e:
            logger.warning(f"LLM Chat Error: {e}")
            return f"I'm having trouble connecting to my core intelligence right now. {str(e)}"

    def clear_history(self) -> str:
        self.conversation_history = []
        return "Conversation history cleared. Starting fresh."

    def _get_client_and_model(self):
        if self.default_provider == "groq":
            return self.groq_client, "llama3-8b-8192"
        if self.default_provider == "openrouter":
            return self.openrouter_client, "google/gemini-2.5-flash"
        if self.default_provider == "openai":
            return self.openai_client, "gpt-4o-mini"
        return None, None

# Singleton LLM Service
llm_service = LLMService()
