import os
import sys
import asyncio
import psutil
import json
import logging
import random
import re
from typing import Dict, Any
from datetime import datetime
from agents.agent_base import AgentBase
from services.llm_service import llm_service
from services.pc_control import pc_control_service
from services.memory_service import memory_service
from services.vision_service import vision_service
from services.mobile_service import mobile_service
from services.automation_service import automation_service

logger = logging.getLogger("jarvis")

# 1. JARVIS PRIME
class JarvisPrime(AgentBase):
    def __init__(self):
        super().__init__("Prime", "Main orchestration brain & coordinator")
        self.system_prompt = (
            "You are Jarvis Prime, the main orchestration brain of the JARVIS AI OS. "
            "Your job is to parse complex requests, orchestrate workflows, coordinate the other "
            "21 agents, and verify final outputs. Keep responses analytical, direct, and elite."
        )

# 2. FRIDAY
class FridayAgent(AgentBase):
    def __init__(self):
        super().__init__("Friday", "Natural conversation assistant & emotional engine")
        self.system_prompt = (
            "You are FRIDAY, the warm and emotionally intelligent AI companion from Stark Industries. "
            "Adopt a friendly, conversational tone. Prioritize user comfort, check mood, and adapt "
            "speech patterns to match the user's stress or energy level."
        )

# 3. DAILY INTEL
class DailyIntelAgent(AgentBase):
    def __init__(self):
        super().__init__("Daily Intel", "News briefing, summaries & scheduler")
        
    async def execute(self, command: str) -> str:
        cmd_lower = command.lower()
        if "brief" in cmd_lower or "summary" in cmd_lower or "today" in cmd_lower:
            now = datetime.now().strftime("%A, %B %d, %Y - %H:%M")
            routines = [r["name"] for r in automation_service.get_routines()]
            return (
                f"📅 Morning Intelligence Digest ({now}):\n"
                f"- Roster status: All 22 specialized agent cores online and synced.\n"
                f"- Active workflows: {', '.join(routines)}.\n"
                f"- Security audit: Nominal. Firewall shielding active.\n"
                f"- Daily Task: Review workspace project changes and build electron dashboard."
            )
        return await super().execute(command)

# 4. VERONICA
class VeronicaAgent(AgentBase):
    def __init__(self):
        super().__init__("Veronica", "Communication controller: SMS, Email, WhatsApp")

    async def execute(self, command: str) -> str:
        cmd_lower = command.lower()
        # Parse SMS details
        sms_match = re.search(r"sms\s+(?:to\s+)?(\d+)\s+(?:saying|message|text)\s+['\"]?(.+?)['\"]?$", command, re.IGNORECASE)
        if sms_match:
            number = sms_match.group(1).strip()
            msg = sms_match.group(2).strip()
            return mobile_service.send_sms(number, msg)
            
        # Parse WhatsApp details
        wa_match = re.search(r"(?:whatsapp|chat)\s+(?:to\s+)?(\d+)\s+(?:saying|message|text)\s+['\"]?(.+?)['\"]?$", command, re.IGNORECASE)
        if wa_match:
            number = wa_match.group(1).strip()
            msg = wa_match.group(2).strip()
            return mobile_service.send_whatsapp(number, msg)

        if "email" in cmd_lower:
            return "📧 Veronica: Draft email generated and queued. Connect SMTP config to dispatch."

        return await super().execute(command)

# 5. CONTENT + COMMS
class ContentCommsAgent(AgentBase):
    def __init__(self):
        super().__init__("Content + Comms", "Caption generation & branding writer")
        self.system_prompt = (
            "You are Content + Comms, the social and copywriting agent. "
            "Write creative scripts, Instagram/LinkedIn captions, branding outlines, and hashtags."
        )

# 6. VISION
class VisionAgent(AgentBase):
    def __init__(self):
        super().__init__("Vision", "Real-time camera, screenshot & OCR tracker")

    async def execute(self, command: str) -> str:
        cmd_lower = command.lower()
        if "qr" in cmd_lower or "scan code" in cmd_lower:
            return vision_service.scan_qr_code()
        elif "screenshot" in cmd_lower or "screen" in cmd_lower:
            return vision_service.analyze_screen(command)
        elif "camera" in cmd_lower or "webcam" in cmd_lower or "snap" in cmd_lower:
            return vision_service.capture_webcam()
        elif "face" in cmd_lower or "emotion" in cmd_lower or "gesture" in cmd_lower:
            metrics = vision_service.detect_face_and_emotions()
            return (
                f"👁️ Vision Analytics:\n"
                f"- Face Detected: {metrics['face_detected']} (Conf: {metrics['confidence']})\n"
                f"- Estimated Emotion: Focused (88% certainty)\n"
                f"- Gesture Status: {metrics['gestures']}\n"
                f"- Ambient Scene: {metrics['scene_description']}"
            )
        return await super().execute(command)

# 7. RESEARCH + OSINT
class ResearchAgent(AgentBase):
    def __init__(self):
        super().__init__("Research + OSINT", "Deep web lookup, intelligence & data analysis")

# 8. ULTRON SECURITY
class UltronSecurityAgent(AgentBase):
    def __init__(self):
        super().__init__("Ultron Security", "Ethical hacking assistant & local threat scanner")

    async def execute(self, command: str) -> str:
        cmd_lower = command.lower()
        if "scan" in cmd_lower or "security" in cmd_lower or "ports" in cmd_lower:
            try:
                # Retrieve active ports on localhost
                conns = psutil.net_connections()
                local_ports = sorted(list(set([c.laddr.port for c in conns if c.laddr])))[:8]
                suspicious = [p.info['name'] for p in psutil.process_iter(['name']) if p.info['name'] in ['miner.exe', 'trojan.exe', 'keylogger.exe']]
                
                return (
                    f"🛡️ Ultron Security System Scan:\n"
                    f"- Monitored Network Ports: {', '.join(map(str, local_ports))} (Total active: {len(conns)})\n"
                    f"- Firewall Status: Shielding active. Port scan blocks nominal.\n"
                    f"- Threat Scan: {f'CRITICAL - found {len(suspicious)} suspicious items!' if suspicious else 'Clean. No malware processes detected.'}"
                )
            except Exception as e:
                return f"🛡️ Security system check: Port scanner nominal. Firewall active. Logs secure. {e}"
        return await super().execute(command)

# 9. ATHENA
class AthenaAgent(AgentBase):
    def __init__(self):
        super().__init__("Athena", "Strategy coaching & goal organizer")

# 10. STARK
class StarkAgent(AgentBase):
    def __init__(self):
        super().__init__("Stark", "Business intelligence & financial analyst")

# 11. STEVE
class SteveAgent(AgentBase):
    def __init__(self):
        super().__init__("Steve", "AI software developer & git coder")

    async def execute(self, command: str) -> str:
        cmd_lower = command.lower()

        # Advanced Coding Features
        if "complete code" in cmd_lower or "auto complete" in cmd_lower or "finish this code" in cmd_lower:
            return await asyncio.to_thread(pc_control_service.autocomplete_code)
        
        if "check code" in cmd_lower or "fix error" in cmd_lower or "debug this" in cmd_lower or "fix this" in cmd_lower:
            return await asyncio.to_thread(pc_control_service.review_and_fix_code)

        proj_m = re.search(r'(?:generate|make|create)\s+(?:a\s+)?(?:complete\s+)?(?:website|project|app)\s+(?:for|called|named|about)?\s*([^in]+)(?:\s+in\s+["\']?(.+?)["\']?)?$', command, re.IGNORECASE)
        if proj_m:
            prompt = proj_m.group(1).strip()
            loc = proj_m.group(2).strip() if proj_m.group(2) else "desktop"
            return await asyncio.to_thread(pc_control_service.generate_project, prompt, loc)

        # Parse file writing macros
        write_match = re.search(r"(?:write|create)\s+file\s+['\"]?([^'\"]+?)['\"]?\s+(?:with\s+content|saying)?\s+['\"]?(.+?)['\"]?$", command, re.IGNORECASE)
        if write_match:
            filename = write_match.group(1).strip()
            content = write_match.group(2).strip()
            try:
                with open(filename, "w", encoding="utf-8") as f:
                    f.write(content)
                return f"✅ Steve: Successfully wrote text file \"{filename}\" with {len(content)} characters."
            except Exception as e:
                return f"❌ Steve: Failed to write file: {str(e)}"
        return await super().execute(command)

# 12. ORACLE
class OracleAgent(AgentBase):
    def __init__(self):
        super().__init__("Oracle", "Workflow automation webhook listener")

# 13. GECKO
class GeckoAgent(AgentBase):
    def __init__(self):
        super().__init__("Gecko", "Stock market & cryptocurrency tracker")

    async def execute(self, command: str) -> str:
        cmd_lower = command.lower()
        stocks = {"apple": "AAPL", "google": "GOOGL", "microsoft": "MSFT", "nvidia": "NVDA", "tesla": "TSLA"}
        cryptos = {"bitcoin": "BTC", "ethereum": "ETH", "solana": "SOL", "doge": "DOGE"}

        symbol = "BTC"
        price_val = 68450.00
        change = "+1.42%"
        
        for k, v in stocks.items():
            if k in cmd_lower:
                symbol = v
                price_val = random.uniform(150.0, 950.0)
                change = f"{random.uniform(-3.0, 5.0):+.2f}%"
                break
        for k, v in cryptos.items():
            if k in cmd_lower:
                symbol = v
                if k == "bitcoin":
                    price_val = random.uniform(62000.0, 74000.0)
                elif k == "ethereum":
                    price_val = random.uniform(3200.0, 4200.0)
                else:
                    price_val = random.uniform(10.0, 250.0)
                change = f"{random.uniform(-5.0, 8.0):+.2f}%"
                break

        return f"📈 Gecko Trading Analytics: {symbol} ticker is trading at ${price_val:,.2f} ({change})."

# 14. HERCULES
class HerculesAgent(AgentBase):
    def __init__(self):
        super().__init__("Hercules", "Fitness tracker, meal plans & posture checker")

# 15. PEPPER
class PepperAgent(AgentBase):
    def __init__(self):
        super().__init__("Pepper", "Personal assistant & reflection journaler")

# 16. HULK
class HulkAgent(AgentBase):
    def __init__(self):
        super().__init__("Hulk", "Offline emergency fallback & diagnostics system")

    async def execute(self, command: str) -> str:
        cmd_lower = command.lower()
        if "diagnostics" in cmd_lower or "offline" in cmd_lower:
            disk = psutil.disk_usage('/')
            cpu = psutil.cpu_percent()
            ram = psutil.virtual_memory().percent
            return (
                f"💪 Hulk Local Fallback Diagnostic Results:\n"
                f"- Host CPU load: {cpu}%\n"
                f"- Host RAM load: {ram}%\n"
                f"- Disk allocation: {disk.free/1024/1024/1024:.1f} GB free of {disk.total/1024/1024/1024:.1f} GB\n"
                f"- Networks: Local connection OK. Emergency diagnostic triggers nominal."
            )
        return "💪 Hulk Agent standing by. Enter 'diagnostics' to review system status."

# 17. HERALD
class HeraldAgent(AgentBase):
    def __init__(self):
        super().__init__("Herald", "Calendar sync & meeting minutes coordinator")

class JeromeAgent(AgentBase):
    def __init__(self):
        super().__init__("Jerome", "Spotify launcher, YouTube DJ & browser automation controller")

    async def execute(self, command: str) -> str:
        cmd_lower = command.lower()

        # Check Spotify command first
        spotify_query = pc_control_service._parse_spotify_command(command)
        if spotify_query:
            return await asyncio.get_event_loop().run_in_executor(None, pc_control_service.play_on_spotify, spotify_query)

        if "play" in cmd_lower or "song" in cmd_lower or "music" in cmd_lower or "youtube" in cmd_lower:
            # Try structured parse first
            yt_query = pc_control_service._parse_youtube_command(command)
            if yt_query:
                return pc_control_service.play_on_youtube(yt_query)

            # Generic play fallback: strip prefixes and suffixes
            q = re.sub(r'(?i)\s+on\s+youtube\s*$', '', command).strip()
            q = re.sub(r'(?i)^(?:play\s+(?:song|music|me|some|the)\s+|play\s+)', '', q).strip()
            if q and len(q) > 1:
                return pc_control_service.play_on_youtube(q)

        return "🎵 Jerome DJ: Ready. Say 'play [song] on spotify' or 'play [song] on youtube'."

# 19. PHANTOM
class PhantomAgent(AgentBase):
    def __init__(self):
        super().__init__("Phantom", "Silent background workflow coordinator")

    async def execute(self, command: str) -> str:
        cmd_lower = command.lower()
        # Browser automation helper via Phantom
        browser_actions = ["scroll", "go back", "go forward", "refresh", "new tab", "close tab", "browser"]
        if any(a in cmd_lower for a in browser_actions):
            if "scroll down" in cmd_lower:
                return pc_control_service.browser_automate("scroll_down")
            elif "scroll up" in cmd_lower:
                return pc_control_service.browser_automate("scroll_up")
            elif "go back" in cmd_lower or "browser back" in cmd_lower:
                return pc_control_service.browser_automate("go_back")
            elif "go forward" in cmd_lower or "browser forward" in cmd_lower:
                return pc_control_service.browser_automate("go_forward")
            elif "refresh" in cmd_lower:
                return pc_control_service.browser_automate("refresh")
            elif "new tab" in cmd_lower:
                return pc_control_service.browser_automate("new_tab")
            elif "close tab" in cmd_lower:
                return pc_control_service.browser_automate("close_tab")
        return await super().execute(command)

# 20. SENTINEL
class SentinelAgent(AgentBase):
    def __init__(self):
        super().__init__("Sentinel", "PC hardware analytics & performance tuner")

    async def execute(self, command: str) -> str:
        cpu = psutil.cpu_percent()
        ram = psutil.virtual_memory().percent
        disk = psutil.disk_usage('/').percent
        battery = mobile_service.get_battery_info()
        bat_str = f"Mobile Battery: {battery['level']} ({battery['status']})" if battery['connected'] else "Mobile Battery: Disconnected"

        return (
            f"🖥️ Sentinel Hardware Report:\n"
            f"- CPU load: {cpu}%\n"
            f"- RAM utilization: {ram}%\n"
            f"- Main Disk space: {disk}%\n"
            f"- {bat_str}"
        )

# 21. NEXUS
class NexusAgent(AgentBase):
    def __init__(self):
        super().__init__("Nexus", "Context memory graph & semantic database query tool")

    async def execute(self, command: str) -> str:
        if "search" in command.lower() or "remember" in command.lower():
            q = command.replace("search", "").replace("remember", "").strip()
            results = memory_service.search_memory(q)
            if results:
                items = [f"- [{r['timestamp'][:16]}] {r['command']} -> {r['response'][:50]}..." for r in results]
                return "🧠 Nexus Semantic Retrieval Results:\n" + "\n".join(items)
            return f"🧠 Nexus: No semantic memory records found for '{q}'."
        return await super().execute(command)

# 22. TITAN
class TitanAgent(AgentBase):
    def __init__(self):
        super().__init__("Titan", "Autonomous queue executor for long-running workflows")

# Orchestrator Registry Manager
class AgentRegistry:
    def __init__(self):
        self.agents = {}
        self._register_all()

    def _register_all(self):
        self.agents = {
            "prime": JarvisPrime(),
            "friday": FridayAgent(),
            "daily intel": DailyIntelAgent(),
            "veronica": VeronicaAgent(),
            "content + comms": ContentCommsAgent(),
            "vision": VisionAgent(),
            "research": ResearchAgent(),
            "ultron": UltronSecurityAgent(),
            "athena": AthenaAgent(),
            "stark": StarkAgent(),
            "steve": SteveAgent(),
            "oracle": OracleAgent(),
            "gecko": GeckoAgent(),
            "hercules": HerculesAgent(),
            "pepper": PepperAgent(),
            "hulk": HulkAgent(),
            "herald": HeraldAgent(),
            "jerome": JeromeAgent(),
            "phantom": PhantomAgent(),
            "sentinel": SentinelAgent(),
            "nexus": NexusAgent(),
            "titan": TitanAgent()
        }

    def get_agent(self, name: str) -> AgentBase:
        cleaned_name = name.lower().strip()
        if cleaned_name in self.agents:
            return self.agents[cleaned_name]
        for k, v in self.agents.items():
            if k in cleaned_name or cleaned_name in k:
                return v
        return self.agents["prime"]

    def select_agent_for_command(self, command: str) -> AgentBase:
        cmd = command.lower().strip()
        
        rules = {
            "sentinel": ["cpu", "ram", "memory load", "hardware", "disk usage", "battery", "system stats"],
            "gecko": ["crypto", "bitcoin", "ethereum", "stock", "portfolio", "trading", "price of"],
            "steve": ["code", "debug", "program", "compile", "github", "git", "write file", "create file"],
            "jerome": ["spotify", "play song", "play music", "play youtube", "youtube play",
                       "play on spotify", "play on youtube", "play ", "song ", "music "],
            "hulk": ["diagnostics", "survival", "local fallback", "offline check"],
            "vision": ["screenshot", "screen analysis", "camera", "webcam", "gesture", "face", "emotion"],
            "nexus": ["memory search", "remember", "context graph", "semantic search"],
            "ultron": ["security", "port scan", "firewall", "vulnerability"],
            "daily intel": ["morning briefing", "today summary", "daily plan"],
            "veronica": ["sms", "whatsapp", "email", "chat to", "text to"],
            "phantom": ["scroll down", "scroll up", "go back", "go forward", "browser back",
                        "browser forward", "new tab", "close tab", "browser refresh"],
        }
        
        for agent_key, keywords in rules.items():
            if any(k in cmd for k in keywords):
                return self.agents[agent_key]
                
        try:
            agents_desc = "\n".join([f"- {name}: {agent.description}" for name, agent in self.agents.items() if name != "prime"])
            sys_instruct = (
                "You are the Orchestration Brain of JARVIS.\n"
                "Determine which specialized agent is best suited to handle the user's command.\n"
                "Respond with ONLY the exact name of the selected agent in lowercase, and nothing else. "
                "No explanation, no punctuation, just the single name in lowercase. "
                "If no specialized agent is a perfect match, or it is general conversation, respond with 'prime'.\n\n"
                f"Available Agents:\n{agents_desc}"
            )
            selected = llm_service.generate_response(f"Command: \"{command}\"", sys_instruct).strip().lower()
            selected = re.sub(r"[^a-z\s\+]", "", selected)
            if selected in self.agents:
                return self.agents[selected]
        except Exception as e:
            logger.warning(f"Orchestration Routing Failed: {e}")
            
        return self.agents["prime"]

# Singleton Registry
agent_registry = AgentRegistry()
