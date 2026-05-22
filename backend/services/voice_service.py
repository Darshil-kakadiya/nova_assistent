import os
import sys
import re
import queue
import threading
import subprocess
import logging
from typing import Optional

logger = logging.getLogger("jarvis")

WAKE_WORDS = ["hey jarvis", "wake up jarvis", "jarvis wake up", "ok jarvis", "yo jarvis", "jarvis"]
SLEEP_WORDS = ["go to sleep", "goodbye jarvis", "sleep mode", "jarvis sleep", "standby"]

class HindiSupport:
    def __init__(self):
        self.command_map = {
            "namaste": "hello", "namaskar": "hello", "kya haal hai": "how are you",
            "kholo": "open", "band karo": "close", "screenshot lo": "screenshot",
            "awaaz badhao": "volume up", "awaaz kam karo": "volume down",
            "band karo awaaz": "mute", "chalu karo": "start",
            "band karo computer": "shutdown", "restart karo": "restart",
            "neend mode": "sleep", "prakash badhao": "brightness up",
            "prakash kam karo": "brightness down", "yaad dilao": "remind me",
            "schedule karo": "schedule", "kya kaam hai": "show tasks",
            "aaj ka plan": "today summary", "gaana bajao": "play music",
            "gaana band karo": "pause music", "agla gaana": "next song",
            "pichla gaana": "previous song", "dhundo": "search",
            "khojo": "find", "batao": "tell me", "code likho": "write code",
            "bug dhundo": "debug", "galti theek karo": "fix error",
            "vyayam": "workout", "swasthya": "health", "pani peeyo": "drink water",
            "paisa": "money", "status batao": "status", "help karo": "help",
            "meri madad karo": "help", "sabhi agents": "agents", "itihas": "history",
        }

    def is_hindi(self, text: str) -> bool:
        lower = text.lower()
        return any(word in lower for word in self.command_map.keys())

    def translate(self, text: str) -> str:
        result = text.lower().strip()
        for hindi, english in self.command_map.items():
            result = re.sub(rf"\b{hindi}\b", english, result, flags=re.IGNORECASE)
        return re.sub(r"\s+", " ", result).strip()

class VoiceService:
    def __init__(self):
        self.platform = sys.platform
        self.is_listening = False
        self.is_awake = True
        self.voice_name = "Microsoft David Desktop"
        self.rate = 0
        self.volume = 100
        
        self.hindi = HindiSupport()
        self.speech_queue = queue.Queue(maxsize=5)
        self.is_speaking = False
        self._start_speech_worker()

        # Enumerate voice on windows
        if self.platform == "win32":
            try:
                ps_cmd = (
                    "Add-Type -AssemblyName System.Speech; "
                    "(New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | "
                    "ForEach-Object { $_.VoiceInfo.Name }"
                )
                output = subprocess.check_output(["powershell", "-Command", ps_cmd], text=True, timeout=5)
                voices = [v.strip() for v in output.strip().split("\n") if v.strip()]
                if voices:
                    david_voice = next((v for v in voices if "David" in v), voices[0])
                    self.voice_name = david_voice
                    logger.info(f"TTS voice active: {self.voice_name}")
            except Exception as e:
                logger.warning(f"Could not enumerate voice: {e}")

    def _start_speech_worker(self):
        def worker():
            while True:
                text = self.speech_queue.get()
                if text is None:
                    break
                self.is_speaking = True
                print(f"\n\x1b[32m🔊 JARVIS: {text}\x1b[0m\n")
                try:
                    if self.platform == "win32":
                        self._speak_win32(text)
                    elif self.platform == "darwin":
                        self._speak_mac(text)
                    else:
                        self._speak_linux(text)
                except Exception as e:
                    logger.warning(f"Speech output failed: {e}")
                finally:
                    self.is_speaking = False
                    self.speech_queue.task_done()

        t = threading.Thread(target=worker, daemon=True)
        t.start()

    def speak(self, text: str):
        if not text or not text.strip():
            return
        try:
            self.speech_queue.put_nowait(text)
        except queue.Full:
            logger.warning("Speech queue full, dropping utterance")

    def _speak_win32(self, text: str):
        safe = text.replace("'", "''").replace("\n", " ").strip()
        # strip non-ascii
        safe = re.sub(r"[^\x00-\x7F]+", "", safe)
        ps = (
            f"Add-Type -AssemblyName System.Speech; "
            f"$s=New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            f"$s.SelectVoice('{self.voice_name}'); $s.Rate={self.rate}; $s.Volume={self.volume}; "
            f"$s.Speak('{safe}');"
        )
        subprocess.run(["powershell", "-Command", ps], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def _speak_mac(self, text: str):
        safe = text.replace('"', '\\"').replace("\n", " ")
        subprocess.run(f'say "{safe}"', shell=True)

    def _speak_linux(self, text: str):
        safe = text.replace('"', '\\"').replace("\n", " ")
        try:
            subprocess.run(f'espeak "{safe}"', shell=True)
        except Exception:
            pass

    def filter_command(self, text: str) -> Optional[str]:
        raw = text.strip()
        if not raw:
            return None

        # Translate Hindi -> English
        command = raw
        if self.hindi.is_hindi(raw):
            command = self.hindi.translate(raw)
            logger.info(f"Translated: \"{raw}\" -> \"{command}\"")

        command_lower = command.lower().strip()

        # Handle sleep words
        if any(word == command_lower or command_lower.startswith(word) for word in SLEEP_WORDS):
            self.is_awake = False
            self.speak("Standing by.")
            return "STANDBY_MODE"

        # Handle wake words
        has_wake = False
        for word in WAKE_WORDS:
            if command_lower.startswith(word):
                self.is_awake = True
                has_wake = True
                # Strip the wake word
                command = re.sub(rf"^{word}[,!]?\s*", "", command, flags=re.IGNORECASE).strip()
                break

        if has_wake and not command:
            # Just said "Hey Jarvis"
            self.speak("Yes? I am listening.")
            return "WAKE_WORD_DETECTED"

        if self.is_awake:
            return command
        return None

# Singleton Voice Service
voice_service = VoiceService()
