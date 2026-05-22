from typing import Dict, Any
from services.llm_service import llm_service
from services.memory_service import memory_service

class AgentBase:
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.is_active = True
        self.task_count = 0
        self.success_count = 0
        self.system_prompt = (
            f"You are {name}, JARVIS's {description}. "
            "Keep your answers concise, practical, and in character."
        )

    async def process(self, command: str) -> str:
        try:
            self.task_count += 1
            response = await self.execute(command)
            self.success_count += 1
            return response
        except Exception as e:
            return f"Error in {self.name}: {str(e)}"

    async def execute(self, command: str) -> str:
        await self.log_activity("llm_process_command", {"command": command})
        # Standard execution is sending prompt to LLM service
        return llm_service.generate_response(command, self.system_prompt)

    def get_status(self) -> Dict[str, Any]:
        success_rate = (
            f"{(self.success_count / self.task_count * 100):.2f}%"
            if self.task_count > 0
            else "N/A"
        )
        return {
            "name": self.name,
            "is_active": self.is_active,
            "task_count": self.task_count,
            "success_rate": success_rate,
        }

    async def log_activity(self, action: str, details: Dict[str, Any]):
        memory_service.add_activity(self.name, action, details)
