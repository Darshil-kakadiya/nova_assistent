import time
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Callable

logger = logging.getLogger("jarvis")

class AutomationService:
    def __init__(self):
        self.routines = []
        self.running_tasks = {}
        self._init_default_routines()

    def _init_default_routines(self):
        # Sample background automation tasks
        self.routines = [
            {
                "id": "morning_brief",
                "name": "Morning Briefing",
                "trigger_type": "time",
                "trigger_value": "08:00",
                "action": "morning briefing summary",
                "status": "Active"
            },
            {
                "id": "cache_cleanup",
                "name": "Midnight System Cleanup",
                "trigger_type": "time",
                "trigger_value": "23:59",
                "action": "clean temp files",
                "status": "Active"
            },
            {
                "id": "hourly_water",
                "name": "Hourly Health Reminder",
                "trigger_type": "interval",
                "trigger_value": "3600",
                "action": "remind me to drink water",
                "status": "Active"
            }
        ]

    def get_routines(self) -> List[Dict[str, Any]]:
        return self.routines

    def add_routine(self, name: str, trigger_type: str, trigger_value: str, action: str) -> Dict[str, Any]:
        import uuid
        new_id = str(uuid.uuid4())[:8]
        routine = {
            "id": new_id,
            "name": name,
            "trigger_type": trigger_type,
            "trigger_value": trigger_value,
            "action": action,
            "status": "Active"
        }
        self.routines.append(routine)
        logger.info(f"[Automation] New workflow routine registered: {name}")
        return routine

    def remove_routine(self, routine_id: str) -> bool:
        initial_len = len(self.routines)
        self.routines = [r for r in self.routines if r["id"] != routine_id]
        return len(self.routines) < initial_len

# Singleton Automation Service
automation_service = AutomationService()
