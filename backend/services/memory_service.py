import os
import sqlite3
import json
import logging
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger("jarvis")

class MemoryService:
    def __init__(self):
        self.data_dir = os.path.join(os.getcwd(), ".jarvis-data")
        os.makedirs(self.data_dir, exist_ok=True)
        self.db_path = os.path.join(self.data_dir, "jarvis_memory.db")
        self._init_db()

    def _init_db(self):
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            # Conversations
            c.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    command TEXT,
                    response TEXT,
                    agent TEXT,
                    timestamp TEXT
                )
            """)
            # Activities
            c.execute("""
                CREATE TABLE IF NOT EXISTS activities (
                    id TEXT PRIMARY KEY,
                    agent TEXT,
                    action TEXT,
                    details TEXT,
                    timestamp TEXT
                )
            """)
            # Preferences
            c.execute("""
                CREATE TABLE IF NOT EXISTS preferences (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TEXT
                )
            """)
            conn.commit()
            conn.close()
            logger.info("📚 SQLite Memory database initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize SQLite database: {e}")

    def add_conversation(self, command: str, response: str, agent: str) -> str:
        import uuid
        conv_id = str(uuid.uuid4())
        ts = datetime.now().isoformat()
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute(
                "INSERT INTO conversations (id, command, response, agent, timestamp) VALUES (?, ?, ?, ?, ?)",
                (conv_id, command, response, agent, ts)
            )
            conn.commit()
            conn.close()
            return conv_id
        except Exception as e:
            logger.warning(f"Failed to save conversation memory: {e}")
            return ""

    def add_activity(self, agent: str, action: str, details: Dict[str, Any]):
        import uuid
        act_id = str(uuid.uuid4())
        ts = datetime.now().isoformat()
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute(
                "INSERT INTO activities (id, agent, action, details, timestamp) VALUES (?, ?, ?, ?, ?)",
                (act_id, agent, action, json.dumps(details), ts)
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"Failed to log activity: {e}")

    def get_conversation_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute(
                "SELECT id, command, response, agent, timestamp FROM conversations ORDER BY timestamp DESC LIMIT ?",
                (limit,)
            )
            rows = c.fetchall()
            conn.close()
            
            history = []
            for r in reversed(rows):
                history.append({
                    "id": r[0],
                    "command": r[1],
                    "response": r[2],
                    "agent": r[3],
                    "timestamp": r[4]
                })
            return history
        except Exception as e:
            logger.warning(f"Failed to retrieve conversation history: {e}")
            return []

    def set_preference(self, key: str, value: Any):
        ts = datetime.now().isoformat()
        val_str = json.dumps(value)
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute(
                "INSERT INTO preferences (key, value, updated_at) VALUES (?, ?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
                (key, val_str, ts)
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"Failed to set preference: {e}")

    def get_preference(self, key: str, default: Any = None) -> Any:
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute("SELECT value FROM preferences WHERE key = ?", (key,))
            row = c.fetchone()
            conn.close()
            if row:
                return json.loads(row[0])
            return default
        except Exception as e:
            logger.warning(f"Failed to get preference: {e}")
            return default

    def search_memory(self, query: str) -> List[Dict[str, Any]]:
        # Keyword based SQLite search (fallback to semantic concept index)
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute(
                "SELECT command, response, agent, timestamp FROM conversations "
                "WHERE command LIKE ? OR response LIKE ? ORDER BY timestamp DESC LIMIT 5",
                (f"%{query}%", f"%{query}%")
            )
            rows = c.fetchall()
            conn.close()
            return [{"command": r[0], "response": r[1], "agent": r[2], "timestamp": r[3]} for r in rows]
        except Exception as e:
            logger.warning(f"Search memory failed: {e}")
            return []

# Singleton Memory Service
memory_service = MemoryService()
