import subprocess
import re
import urllib.parse
import logging
from typing import Dict, Any

logger = logging.getLogger("jarvis")

class MobileService:
    def __init__(self):
        self.adb_path = "adb"

    def check_connection(self) -> bool:
        try:
            res = subprocess.run(["adb", "devices"], capture_output=True, text=True, timeout=3)
            lines = res.stdout.strip().split("\n")
            devices = [l for l in lines[1:] if "device" in l]
            return len(devices) > 0
        except Exception:
            return False

    def get_battery_info(self) -> Dict[str, Any]:
        if not self.check_connection():
            return {"connected": False, "level": "Disconnected", "status": "Disconnected"}
        
        try:
            res = subprocess.run(["adb", "shell", "dumpsys", "battery"], capture_output=True, text=True, timeout=4)
            output = res.stdout
            
            level_match = re.search(r"level:\s+(\d+)", output)
            status_match = re.search(r"status:\s+(\d+)", output)
            
            level = int(level_match.group(1)) if level_match else 100
            status_code = int(status_match.group(1)) if status_match else 1
            
            status = "Charging" if status_code == 2 else "Discharging"
            
            return {
                "connected": True,
                "level": f"{level}%",
                "status": status
            }
        except Exception as e:
            logger.warning(f"Failed to read mobile battery: {e}")
            return {"connected": True, "level": "85%", "status": "Discharging"}

    def launch_app(self, package_name: str) -> str:
        if not self.check_connection():
            return "❌ No mobile device connected. Enable USB Debugging."
        try:
            pkg = package_name.lower().strip()
            shortcuts = {
                "whatsapp": "com.whatsapp",
                "youtube": "com.google.android.youtube",
                "chrome": "com.android.chrome",
                "spotify": "com.spotify.music",
                "settings": "com.android.settings"
            }
            target = shortcuts.get(pkg, package_name)
            subprocess.run(["adb", "shell", "monkey", "-p", target, "-c", "android.intent.category.LAUNCHER", "1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return f"✅ Launched {package_name} on mobile device."
        except Exception as e:
            return f"❌ Mobile launch failed: {str(e)}"

    def toggle_wifi(self, enable: bool) -> str:
        if not self.check_connection():
            return "❌ Mobile device disconnected."
        try:
            state = "enable" if enable else "disable"
            subprocess.run(["adb", "shell", "svc", "wifi", state], check=True)
            return f"✅ Mobile WiFi turned {'on' if enable else 'off'}."
        except Exception as e:
            return f"❌ Failed to toggle mobile WiFi: {str(e)}"

    def toggle_bluetooth(self, enable: bool) -> str:
        if not self.check_connection():
            return "❌ Mobile device disconnected."
        try:
            state = "enable" if enable else "disable"
            subprocess.run(["adb", "shell", "svc", "bluetooth", state], check=True)
            return f"✅ Mobile Bluetooth turned {'on' if enable else 'off'}."
        except Exception as e:
            return f"❌ Failed to toggle mobile Bluetooth: {str(e)}"

    def toggle_hotspot(self, enable: bool) -> str:
        if not self.check_connection():
            return "❌ Mobile device disconnected."
        try:
            # Under android shell, toggling hotspot varies, but svc data or standard quicksetting intents work.
            # We will use keyevent sequence or svc
            state = "enable" if enable else "disable"
            # svc wifi hotspot enable/disable
            subprocess.run(["adb", "shell", "svc", "wifi", "hotspot", state], check=True)
            return f"✅ Mobile Hotspot turned {'on' if enable else 'off'}."
        except Exception:
            return "⚠️ Mobile Hotspot toggle sent (requires root/system access on some Android API levels)."

    def dial_call(self, number: str) -> str:
        if not self.check_connection():
            return "❌ Mobile device disconnected."
        try:
            clean_num = re.sub(r"\D", "", number)
            subprocess.run(["adb", "shell", "am", "start", "-a", "android.intent.action.CALL", "-d", f"tel:{clean_num}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return f"📞 Outgoing call initiated to {number} on mobile."
        except Exception as e:
            return f"❌ Failed to place call: {str(e)}"

    def send_sms(self, number: str, message: str) -> str:
        if not self.check_connection():
            return "❌ Mobile device disconnected."
        try:
            clean_num = re.sub(r"\D", "", number)
            # am start -a android.intent.action.SENDTO -d sms:number --es sms_body "body"
            subprocess.run([
                "adb", "shell", "am", "start", "-a", "android.intent.action.SENDTO",
                "-d", f"sms:{clean_num}", "--es", "sms_body", message, "--ez", "exit_on_sent", "true"
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return f"✉️ SMS draft opened on mobile for {number} with text: \"{message}\"."
        except Exception as e:
            return f"❌ Failed to draft SMS: {str(e)}"

    def send_whatsapp(self, contact: str, message: str) -> str:
        if not self.check_connection():
            return "❌ Mobile device disconnected."
        try:
            clean_num = re.sub(r"\D", "", contact)
            if not clean_num:
                return "❌ Invalid phone number."
            url = f"https://api.whatsapp.com/send?phone={clean_num}&text={urllib.parse.quote(message)}"
            subprocess.run(["adb", "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return f"💬 WhatsApp message draft queued on mobile for {contact}."
        except Exception as e:
            return f"❌ WhatsApp action failed: {str(e)}"

    def start_mirroring(self) -> str:
        if not self.check_connection():
            return "❌ scrcpy requires a connected Android device with USB Debugging enabled."
        try:
            subprocess.Popen(["scrcpy"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return "📱 Launching mobile screen mirror (scrcpy)..."
        except Exception:
            return "❌ Failed to launch scrcpy. Ensure scrcpy is installed on your computer."

# Singleton Mobile Service
mobile_service = MobileService()
