import os
import re
import sys
import glob
import shutil
import time
import zipfile
import urllib.parse
import urllib.request
import subprocess
import logging
from datetime import datetime
from services.llm_service import llm_service

logger = logging.getLogger("jarvis")

APP_MAP = {
    "chrome": {"win": "chrome.exe", "mac": "Google Chrome", "linux": "google-chrome", "web": None},
    "firefox": {"win": "firefox.exe", "mac": "Firefox", "linux": "firefox", "web": None},
    "edge": {"win": "msedge.exe", "mac": "Microsoft Edge", "linux": "microsoft-edge", "web": None},
    "notepad": {"win": "notepad.exe", "mac": "TextEdit", "linux": "gedit", "web": None},
    "vs code": {"win": "code.cmd", "mac": "Visual Studio Code", "linux": "code", "web": "https://vscode.dev"},
    "vscode": {"win": "code.cmd", "mac": "Visual Studio Code", "linux": "code", "web": "https://vscode.dev"},
    "calculator": {"win": "calc.exe", "mac": "Calculator", "linux": "gnome-calculator", "web": "https://www.google.com/search?q=calculator"},
    "explorer": {"win": "explorer.exe", "mac": "Finder", "linux": "nautilus", "web": None},
    "spotify": {"win": "Spotify.exe", "mac": "Spotify", "linux": "spotify", "web": "https://open.spotify.com"},
    "discord": {"win": "Discord.exe", "mac": "Discord", "linux": "discord", "web": "https://discord.com/app"},
    "terminal": {"win": "wt.exe", "mac": "Terminal", "linux": "gnome-terminal", "web": None},
    "task manager": {"win": "taskmgr.exe", "mac": "Activity Monitor", "linux": "gnome-system-monitor", "web": None},
    "paint": {"win": "mspaint.exe", "mac": None, "linux": "gimp", "web": "https://jspaint.app"},
    "cmd": {"win": "cmd.exe", "mac": "Terminal", "linux": "bash", "web": None},
    "steam": {"win": "Steam.exe", "mac": "Steam", "linux": "steam", "web": "https://store.steampowered.com"},
    "vlc": {"win": "vlc.exe", "mac": "VLC", "linux": "vlc", "web": "https://www.videolan.org/vlc"},
    "telegram": {"win": "Telegram.exe", "mac": "Telegram", "linux": "telegram-desktop", "web": "https://web.telegram.org"},
    "whatsapp": {"win": "WhatsApp.exe", "mac": "WhatsApp", "linux": "whatsapp-desktop", "web": "https://web.whatsapp.com"},
    "gmail": {"win": None, "mac": None, "linux": None, "web": "https://mail.google.com"},
    "google": {"win": None, "mac": None, "linux": None, "web": "https://www.google.com"},
    "youtube": {"win": None, "mac": None, "linux": None, "web": "https://www.youtube.com"},
    "github": {"win": None, "mac": None, "linux": None, "web": "https://github.com"},
    "netflix": {"win": None, "mac": None, "linux": None, "web": "https://www.netflix.com"},
    "chatgpt": {"win": None, "mac": None, "linux": None, "web": "https://chat.openai.com"},
    "twitter": {"win": None, "mac": None, "linux": None, "web": "https://twitter.com"},
    "x": {"win": None, "mac": None, "linux": None, "web": "https://x.com"},
    "instagram": {"win": None, "mac": None, "linux": None, "web": "https://www.instagram.com"},
    "linkedin": {"win": None, "mac": None, "linux": None, "web": "https://www.linkedin.com"},
    "maps": {"win": None, "mac": None, "linux": None, "web": "https://maps.google.com"},
    "google maps": {"win": None, "mac": None, "linux": None, "web": "https://maps.google.com"},
    "translate": {"win": None, "mac": None, "linux": None, "web": "https://translate.google.com"},
    "figma": {"win": None, "mac": None, "linux": None, "web": "https://www.figma.com"},
    "notion": {"win": None, "mac": None, "linux": None, "web": "https://www.notion.so"},
    "trello": {"win": None, "mac": None, "linux": None, "web": "https://trello.com"},
    "slack": {"win": "slack.exe", "mac": "Slack", "linux": "slack", "web": "https://app.slack.com"},
    "zoom": {"win": "Zoom.exe", "mac": "zoom.us", "linux": "zoom", "web": "https://zoom.us/join"},
    "teams": {"win": "Teams.exe", "mac": "Microsoft Teams", "linux": "teams", "web": "https://teams.microsoft.com"},
    "word": {"win": "WINWORD.EXE", "mac": "Microsoft Word", "linux": None, "web": "https://www.office.com/launch/word"},
    "excel": {"win": "EXCEL.EXE", "mac": "Microsoft Excel", "linux": None, "web": "https://www.office.com/launch/excel"},
    "powerpoint": {"win": "POWERPNT.EXE", "mac": "Microsoft PowerPoint", "linux": None, "web": "https://www.office.com/launch/powerpoint"},
}

class PCControlService:
    def __init__(self):
        self.platform = sys.platform
        self.home = os.path.expanduser("~")

    # --- WEBSITE OPENER ---
    def open_website(self, url: str) -> str:
        """Open any URL or domain in the default browser."""
        # Auto-prepend https:// if missing
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        try:
            if self.platform == "win32":
                subprocess.Popen(f'start "" "{url}"', shell=True)
            elif self.platform == "darwin":
                subprocess.Popen(["open", url])
            else:
                subprocess.Popen(["xdg-open", url])
            return f"🌐 Opening {url} in browser..."
        except Exception as e:
            return f"❌ Could not open website: {str(e)}"

    # --- APP LAUNCHER (with website fallback) ---
    def launch_app(self, app_name: str) -> str:
        key = app_name.lower().strip()
        
        # Check YouTube queries
        yt_query = self._parse_youtube_command(app_name)
        if yt_query:
            return self.play_on_youtube(yt_query)

        # Check Spotify play queries
        spotify_query = self._parse_spotify_command(app_name)
        if spotify_query:
            return self.play_on_spotify(spotify_query)

        app = APP_MAP.get(key)

        # Try to get the native executable
        native_exe = None
        if app:
            if self.platform == "win32":
                native_exe = app.get("win")
            elif self.platform == "darwin":
                native_exe = app.get("mac")
            else:
                native_exe = app.get("linux")
        else:
            # Unknown app: guess exe name
            if self.platform == "win32":
                native_exe = f"{app_name}.exe"
            else:
                native_exe = app_name

        # Try launching native app
        launched = False
        if native_exe:
            try:
                if self.platform == "win32":
                    result = subprocess.Popen(f'start "" "{native_exe}"', shell=True)
                elif self.platform == "darwin":
                    result = subprocess.Popen(["open", "-a", native_exe])
                else:
                    result = subprocess.Popen([native_exe])
                launched = True
                logger.info(f"[Launcher] Launched native app: {native_exe}")
                return f"✅ Launching {app_name}..."
            except Exception as e:
                logger.warning(f"[Launcher] Native app '{native_exe}' failed: {e}")

        # Fallback: open web version
        if not launched:
            web_url = None
            if app and app.get("web"):
                web_url = app["web"]
            else:
                # Smart web search fallback for unknown apps
                web_url = f"https://www.google.com/search?q={urllib.parse.quote(app_name + ' app')}"

            logger.info(f"[Launcher] App not found locally. Opening web fallback: {web_url}")
            try:
                if self.platform == "win32":
                    subprocess.Popen(f'start "" "{web_url}"', shell=True)
                elif self.platform == "darwin":
                    subprocess.Popen(["open", web_url])
                else:
                    subprocess.Popen(["xdg-open", web_url])
                return f"⚠️ {app_name} not installed — opening web version: {web_url}"
            except Exception as e:
                return f"❌ Could not launch {app_name} or its web fallback: {str(e)}"

    def close_app(self, app_name: str) -> str:
        key = app_name.lower().strip()
        try:
            if self.platform == "win32":
                app_info = APP_MAP.get(key, {})
                exe = app_info.get("win", app_name) if app_info else app_name
                if not exe.endswith(".exe"):
                    exe += ".exe"
                subprocess.run(f"taskkill /IM {exe} /F", shell=True, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                subprocess.run(f"pkill -f {app_name}", shell=True, check=True)
            return f"✅ Closed {app_name}"
        except Exception as e:
            return f"❌ Failed to close {app_name}: {str(e)}"

    def play_on_youtube(self, query: str) -> str:
        # Handle homepage sentinel
        if query == "__OPEN_YOUTUBE_HOMEPAGE__":
            target_url = "https://www.youtube.com"
            try:
                if self.platform == "win32":
                    subprocess.Popen(f'start "" "{target_url}"', shell=True)
                elif self.platform == "darwin":
                    subprocess.Popen(["open", target_url])
                else:
                    subprocess.Popen(["xdg-open", target_url])
                return "🌐 Opening YouTube homepage..."
            except Exception as e:
                return f"❌ Could not open YouTube: {str(e)}"

        logger.info(f"[YouTube] Searching for: {query}")
        search_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query)}"
        target_url = search_url
        playing_directly = False

        try:
            req = urllib.request.Request(
                search_url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                html = response.read().decode('utf-8')
                matches = re.findall(r'/watch\?v=[a-zA-Z0-9_-]{11}', html)
                if matches:
                    video_id = matches[0].split("=")[1]
                    target_url = f"https://www.youtube.com/watch?v={video_id}"
                    playing_directly = True
        except Exception as e:
            logger.warning(f"Failed to fetch YouTube direct video: {e}")

        try:
            if self.platform == "win32":
                subprocess.Popen(f'start "" "{target_url}"', shell=True)
            elif self.platform == "darwin":
                subprocess.Popen(["open", target_url])
            else:
                subprocess.Popen(["xdg-open", target_url])

            if playing_directly:
                return f"🎵 Playing \"{query}\" directly on YouTube..."
            else:
                return f"🎵 Opening YouTube search for \"{query}\"..."
        except Exception as e:
            return f"❌ Could not open YouTube: {str(e)}"

    def _parse_youtube_command(self, cmd: str) -> str:
        trimmed = cmd.strip()
        # Match: "open youtube" or "launch youtube" alone (no song query)
        if re.match(r'^(?:open|launch|start)\s+youtube\s*$', trimmed, re.IGNORECASE):
            return "__OPEN_YOUTUBE_HOMEPAGE__"
        m1 = re.match(r"^(?:play|search|find|open)\s+(.+?)\s+(?:on\s+)?youtube$", trimmed, re.IGNORECASE)
        if m1:
            return m1.group(1).strip()
        m2 = re.match(r"^youtube\s+(?:play|search|find|and\s+play)?\s+(.+)$", trimmed, re.IGNORECASE)
        if m2:
            return m2.group(1).strip()
        m3 = re.match(r"^(?:open|launch|start)\s+youtube\s+(?:and\s+)?(?:play\s+)?(.+)$", trimmed, re.IGNORECASE)
        if m3:
            return m3.group(1).strip()
        return None

    def _parse_spotify_command(self, cmd: str) -> str:
        """Parse Spotify play commands. Returns song query or None."""
        trimmed = cmd.strip()
        # "play <song> on spotify" / "spotify play <song>"
        m1 = re.match(r"^(?:play|search|find)\s+(.+?)\s+(?:on\s+)?spotify$", trimmed, re.IGNORECASE)
        if m1:
            return m1.group(1).strip()
        m2 = re.match(r"^spotify\s+(?:play|search|find|and\s+play)?\s+(.+)$", trimmed, re.IGNORECASE)
        if m2:
            return m2.group(1).strip()
        m3 = re.match(r"^(?:open|launch|start)\s+spotify\s+(?:and\s+)?(?:play\s+)?(.+)$", trimmed, re.IGNORECASE)
        if m3:
            return m3.group(1).strip()
        return None

    # --- SPOTIFY AUTOMATION ---
    def play_on_spotify(self, query: str) -> str:
        """Launch Spotify app and search/play the given song query."""
        logger.info(f"[Spotify] Attempting to play: {query}")

        # Step 1: Check if Spotify is installed and launch it
        spotify_paths_win = [
            os.path.join(os.environ.get("APPDATA", ""), "Spotify", "Spotify.exe"),
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "WindowsApps", "Spotify.exe"),
            r"C:\Program Files\Spotify\Spotify.exe",
            r"C:\Program Files (x86)\Spotify\Spotify.exe",
        ]

        spotify_installed = False
        if self.platform == "win32":
            for path in spotify_paths_win:
                if os.path.exists(path):
                    spotify_installed = True
                    try:
                        subprocess.Popen(f'"{path}"', shell=True)
                        logger.info(f"[Spotify] Launched from: {path}")
                    except Exception as e:
                        logger.warning(f"[Spotify] Failed to launch from path: {e}")
                    break

            if not spotify_installed:
                # Try launching via start command
                try:
                    subprocess.Popen('start "" "Spotify"', shell=True)
                    spotify_installed = True
                except:
                    pass

        elif self.platform == "darwin":
            try:
                subprocess.Popen(["open", "-a", "Spotify"])
                spotify_installed = True
            except:
                pass
        else:
            try:
                subprocess.Popen(["spotify"])
                spotify_installed = True
            except:
                pass

        if not spotify_installed:
            # Fallback: open Spotify web player with search
            logger.info("[Spotify] App not found. Falling back to Spotify Web Player.")
            search_url = f"https://open.spotify.com/search/{urllib.parse.quote(query)}"
            try:
                if self.platform == "win32":
                    subprocess.Popen(f'start "" "{search_url}"', shell=True)
                elif self.platform == "darwin":
                    subprocess.Popen(["open", search_url])
                else:
                    subprocess.Popen(["xdg-open", search_url])
                return f"🎵 Spotify not installed — opening Spotify Web Player for '{query}'..."
            except Exception as e:
                return f"❌ Spotify unavailable: {str(e)}"

        # Step 2: Wait for Spotify to load then use pyautogui automation
        try:
            import pyautogui
            time.sleep(3)  # Wait for Spotify to load

            # Use Spotify URI scheme for direct playback (most reliable)
            spotify_uri = f"spotify:search:{urllib.parse.quote(query)}"
            if self.platform == "win32":
                subprocess.Popen(f'start "" "{spotify_uri}"', shell=True)
                time.sleep(2)

            # Keyboard shortcut: Ctrl+L to focus search bar
            pyautogui.hotkey('ctrl', 'l')
            time.sleep(0.5)
            pyautogui.hotkey('ctrl', 'a')  # Select all
            time.sleep(0.2)
            pyautogui.write(query, interval=0.05)
            time.sleep(0.5)
            pyautogui.press('enter')
            time.sleep(1.5)
            # Press Enter again to play first result
            pyautogui.press('enter')

            return f"🎵 Playing '{query}' on Spotify!"
        except ImportError:
            # pyautogui not available — use URI scheme only
            try:
                spotify_search_url = f"https://open.spotify.com/search/{urllib.parse.quote(query)}"
                if self.platform == "win32":
                    subprocess.Popen(f'start "" "spotify:search:{urllib.parse.quote(query)}"', shell=True)
                return f"🎵 Opened Spotify search for '{query}'. Click play on the first result!"
            except Exception as e:
                return f"⚠️ Spotify launched but automation unavailable: {str(e)}"
        except Exception as e:
            return f"🎵 Spotify launched — search for '{query}' manually. (Automation error: {str(e)})"

    # --- BROWSER AUTOMATION ---
    def browser_automate(self, action: str, url: str = None, text: str = None,
                          x: int = None, y: int = None) -> str:
        """
        Automate browser actions using pyautogui.
        Actions: open_url, click, type_text, scroll_down, scroll_up,
                 go_back, go_forward, refresh, new_tab, close_tab,
                 zoom_in, zoom_out, find_in_page, focus_address_bar
        """
        try:
            import pyautogui
            action = action.lower().strip()

            if action == "open_url" and url:
                # Focus address bar (works in Chrome, Firefox, Edge)
                pyautogui.hotkey('ctrl', 'l')
                time.sleep(0.3)
                pyautogui.hotkey('ctrl', 'a')
                time.sleep(0.1)
                pyautogui.write(url, interval=0.03)
                time.sleep(0.2)
                pyautogui.press('enter')
                return f"🌐 Navigating browser to: {url}"

            elif action == "click":
                if x is not None and y is not None:
                    pyautogui.moveTo(x, y, duration=0.4)
                    pyautogui.click()
                    return f"🖱️ Clicked at ({x}, {y})"
                return "❌ Coordinates required for click action."

            elif action == "type_text" and text:
                pyautogui.write(text, interval=0.04)
                return f"⌨️ Typed: '{text}'"

            elif action == "scroll_down":
                pyautogui.scroll(-500)
                return "📜 Scrolled down"

            elif action == "scroll_up":
                pyautogui.scroll(500)
                return "📜 Scrolled up"

            elif action == "go_back":
                pyautogui.hotkey('alt', 'left')
                return "⬅️ Browser: went back"

            elif action == "go_forward":
                pyautogui.hotkey('alt', 'right')
                return "➡️ Browser: went forward"

            elif action == "refresh":
                pyautogui.hotkey('ctrl', 'r')
                return "🔄 Browser: refreshed page"

            elif action == "new_tab":
                pyautogui.hotkey('ctrl', 't')
                return "🆕 Browser: opened new tab"

            elif action == "close_tab":
                pyautogui.hotkey('ctrl', 'w')
                return "❌ Browser: closed current tab"

            elif action == "zoom_in":
                pyautogui.hotkey('ctrl', '+')
                return "🔍 Browser: zoomed in"

            elif action == "zoom_out":
                pyautogui.hotkey('ctrl', '-')
                return "🔎 Browser: zoomed out"

            elif action == "find_in_page" and text:
                pyautogui.hotkey('ctrl', 'f')
                time.sleep(0.3)
                pyautogui.write(text, interval=0.04)
                return f"🔍 Searching for '{text}' on page"

            elif action == "focus_address_bar":
                pyautogui.hotkey('ctrl', 'l')
                return "📍 Focused browser address bar"

            elif action == "select_all":
                pyautogui.hotkey('ctrl', 'a')
                return "✅ Selected all"

            elif action == "copy":
                pyautogui.hotkey('ctrl', 'c')
                return "📋 Copied to clipboard"

            elif action == "paste":
                pyautogui.hotkey('ctrl', 'v')
                return "📋 Pasted from clipboard"

            elif action == "save_page":
                pyautogui.hotkey('ctrl', 's')
                return "💾 Save dialog opened"

            elif action == "devtools":
                pyautogui.hotkey('f12')
                return "🛠️ Browser DevTools opened"

            else:
                return f"❓ Unknown browser action: '{action}'. Available: open_url, click, type_text, scroll_down, scroll_up, go_back, go_forward, refresh, new_tab, close_tab, zoom_in, zoom_out, find_in_page, focus_address_bar"

        except ImportError:
            return "❌ pyautogui is not installed. Run: pip install pyautogui"
        except Exception as e:
            return f"❌ Browser automation error: {str(e)}"

    # --- KEYBOARD & MOUSE AUTOMATION ---
    def mouse_click(self, x: int = None, y: int = None, click_type: str = "left") -> str:
        try:
            import pyautogui
            if x is not None and y is not None:
                pyautogui.moveTo(x, y, duration=0.5)
            if click_type == "right":
                pyautogui.click(button="right")
            elif click_type == "double":
                pyautogui.doubleClick()
            else:
                pyautogui.click()
            return f"✅ Mouse clicked ({click_type}) at {x if x else 'current'}, {y if y else 'current'}."
        except Exception as e:
            return f"❌ Mouse control error: {str(e)}"

    def keyboard_type(self, text: str) -> str:
        try:
            import pyautogui
            pyautogui.write(text, interval=0.01)
            return "✅ Text typed successfully."
        except Exception as e:
            return f"❌ Keyboard error: {str(e)}"

    def keyboard_press(self, key_combination: str) -> str:
        try:
            import pyautogui
            keys = [k.strip().lower() for k in key_combination.split("+")]
            if len(keys) > 1:
                # Key combo (e.g. ctrl+c)
                pyautogui.hotkey(*keys)
            else:
                pyautogui.press(keys[0])
            return f"✅ Pressed combination: {key_combination}"
        except Exception as e:
            return f"❌ Keypress error: {str(e)}"

    # --- CLIPBOARD INTELLIGENCE ---
    def clipboard_set(self, text: str) -> str:
        try:
            import pyperclip
            pyperclip.copy(text)
            return "✅ Text copied to clipboard."
        except Exception:
            # Fallback to Powershell
            try:
                safe_text = text.replace("'", "''")
                subprocess.run(f"powershell -Command \"Set-Clipboard -Value '{safe_text}'\"", shell=True)
                return "✅ Text copied to clipboard (PowerShell fallback)."
            except Exception as e:
                return f"❌ Clipboard write failed: {str(e)}"

    def clipboard_get(self) -> str:
        try:
            import pyperclip
            return pyperclip.paste()
        except Exception:
            try:
                res = subprocess.run("powershell -Command \"Get-Clipboard\"", shell=True, capture_output=True, text=True)
                return res.stdout.strip()
            except Exception as e:
                return f"❌ Clipboard read failed: {str(e)}"

    # --- SYSTEM CLEANUP ---
    def clean_system(self) -> str:
        logger.info("[PC Health] Initializing system cache cleanup...")
        temp_dirs = []
        if self.platform == "win32":
            temp_dirs = [
                os.path.join(os.environ.get("SystemRoot", "C:\\Windows"), "Temp"),
                os.path.join(os.environ.get("USERPROFILE", self.home), "AppData\\Local\\Temp")
            ]
        deleted_files = 0
        freed_bytes = 0

        for d in temp_dirs:
            if not os.path.exists(d):
                continue
            for item in os.listdir(d):
                path = os.path.join(d, item)
                try:
                    if os.path.isdir(path):
                        shutil.rmtree(path)
                    else:
                        freed_bytes += os.path.getsize(path)
                        os.remove(path)
                    deleted_files += 1
                except Exception:
                    pass  # Ignore files in use

        mb_freed = freed_bytes / (1024 * 1024)
        return f"🧹 System cleanup finished: deleted {deleted_files} files/folders. Freed {mb_freed:.2f} MB of disk cache."

    # --- SYSTEM CONTROLS ---
    def control_volume(self, cmd: str) -> str:
        cmd_lower = cmd.lower()
        try:
            import pyautogui
            if "mute" in cmd_lower:
                pyautogui.press('volumemute')
                return "🔇 System Muted/Unmuted"
            elif "up" in cmd_lower:
                for _ in range(5):
                    pyautogui.press('volumeup')
                return "🔊 Volume Increased"
            elif "down" in cmd_lower:
                for _ in range(5):
                    pyautogui.press('volumedown')
                return "🔉 Volume Decreased"
            return "🔊 Volume adjusted"
        except Exception as e:
            return f"⚠️ Volume adjustment error: {str(e)}"

    def control_brightness(self, cmd: str) -> str:
        try:
            match = re.search(r"\d+", cmd)
            level = int(match.group(0)) if match else 50
            if self.platform == "win32":
                subprocess.run(
                    f'powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, {level})"',
                    shell=True, check=True
                )
                return f"💡 Brightness set to {level}%"
            return "💡 Brightness control supported on Windows systems."
        except Exception as e:
            return f"⚠️ Brightness adjustment error: {str(e)}"

    def take_screenshot(self) -> str:
        try:
            screenshot_dir = os.path.join(self.home, "Pictures", "Screenshots")
            os.makedirs(screenshot_dir, exist_ok=True)
            ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            filename = f"JARVIS_screenshot_{ts}.png"
            filepath = os.path.join(screenshot_dir, filename)

            try:
                import pyautogui
                pyautogui.screenshot(filepath)
            except Exception as e:
                if self.platform == "win32":
                    ps_cmd = (
                        "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; "
                        "$screen=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; "
                        "$bmp=New-Object System.Drawing.Bitmap($screen.Width,$screen.Height); "
                        "$g=[System.Drawing.Graphics]::FromImage($bmp); "
                        f"$g.CopyFromScreen($screen.Location,[System.Drawing.Point]::Empty,$screen.Size); "
                        f"$bmp.Save('{filepath}'); $g.Dispose(); $bmp.Dispose()"
                    )
                    subprocess.run(f'powershell -Command "{ps_cmd}"', shell=True, check=True)
                else:
                    raise e
            return f"✅ Screenshot saved to Pictures\\Screenshots\\{filename}"
        except Exception as e:
            return f"❌ Screenshot failed: {str(e)}"

    def system_control(self, action: str) -> str:
        try:
            if "lock" in action:
                if self.platform == "win32":
                    subprocess.run("rundll32.exe user32.dll,LockWorkStation", shell=True)
                    return "🔒 Workstation locked successfully."
            if action == "shutdown":
                if self.platform == "win32":
                    subprocess.Popen("shutdown /s /t 30", shell=True)
                return "⚠️ System shutting down in 30 seconds! Use 'cancel shutdown' to abort."
            elif action == "restart":
                if self.platform == "win32":
                    subprocess.Popen("shutdown /r /t 30", shell=True)
                return "⚠️ System restarting in 30 seconds!"
            elif action == "sleep":
                if self.platform == "win32":
                    subprocess.Popen("rundll32.exe powrprof.dll,SetSuspendState 0,1,0", shell=True)
                return "😴 System entering sleep mode..."
            elif action == "cancel shutdown":
                if self.platform == "win32":
                    subprocess.run("shutdown /a", shell=True)
                return "✅ Shutdown command aborted."
            return f"Action {action} processed."
        except Exception as e:
            return f"❌ System command failed: {str(e)}"

    # =========================================================
    # --- ADVANCED NATURAL LANGUAGE FILE MANAGER ---
    # =========================================================

    def _resolve_path(self, p: str, search_root: str = None) -> str:
        """
        Resolve a human-readable path description to an absolute filesystem path.
        Handles: drive letters, common folder aliases, file search by name.
        """
        if not p:
            return self.home

        p = p.strip().strip('"').strip("'")
        p_lower = p.lower()

        # --- Drive letter shortcuts (Windows) ---
        # "C drive", "D drive", "c:", "d:", "c drive", "the d drive"
        drive_m = re.match(r'^(?:the\s+)?([a-zA-Z])\s*(?:drive|disk|:\\?|:/?)\s*(?:root)?$', p_lower)
        if drive_m:
            letter = drive_m.group(1).upper()
            return f"{letter}:\\"

        # "C:\some\path" or "/some/path" — absolute path as-is
        if os.path.isabs(p) or re.match(r'^[a-zA-Z]:\\', p):
            return p

        # --- Named folder aliases ---
        user_aliases = {
            # User directories
            "desktop":          os.path.join(self.home, "Desktop"),
            "documents":        os.path.join(self.home, "Documents"),
            "document":         os.path.join(self.home, "Documents"),
            "downloads":        os.path.join(self.home, "Downloads"),
            "download":         os.path.join(self.home, "Downloads"),
            "pictures":         os.path.join(self.home, "Pictures"),
            "picture":          os.path.join(self.home, "Pictures"),
            "photos":           os.path.join(self.home, "Pictures"),
            "music":            os.path.join(self.home, "Music"),
            "videos":           os.path.join(self.home, "Videos"),
            "video":            os.path.join(self.home, "Videos"),
            "home":             self.home,
            "user":             self.home,
            "my documents":     os.path.join(self.home, "Documents"),
            "my pictures":      os.path.join(self.home, "Pictures"),
            "my music":         os.path.join(self.home, "Music"),
            "my videos":        os.path.join(self.home, "Videos"),
            "my downloads":     os.path.join(self.home, "Downloads"),
            # Windows system shortcuts
            "appdata":          os.environ.get("APPDATA", os.path.join(self.home, "AppData", "Roaming")),
            "localappdata":     os.environ.get("LOCALAPPDATA", os.path.join(self.home, "AppData", "Local")),
            "temp":             os.environ.get("TEMP", os.path.join(self.home, "AppData", "Local", "Temp")),
            "startup":          os.path.join(self.home, "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup"),
            "program files":    os.environ.get("PROGRAMFILES", "C:\\Program Files"),
            "c drive":          "C:\\",
            "d drive":          "D:\\",
            "e drive":          "E:\\",
            "f drive":          "F:\\",
            "root":             "C:\\",
            "recycle bin":      "shell:RecycleBinFolder",
            "trash":            "shell:RecycleBinFolder",
        }

        # Strip common leading words: "the", "my", "a", "an"
        clean_lower = re.sub(r'^(?:the|my|a|an)\s+', '', p_lower).strip()

        if clean_lower in user_aliases:
            return user_aliases[clean_lower]
        if p_lower in user_aliases:
            return user_aliases[p_lower]

        # "X folder", "X directory", "X file" → strip suffix and retry
        stripped = re.sub(r'\s+(?:folder|directory|dir|file|document|picture|photo|image|video|music|song)s?$', '', clean_lower).strip()
        if stripped in user_aliases:
            return user_aliases[stripped]

        # Check if relative path exists on common roots
        search_roots = [self.home, os.path.join(self.home, "Desktop"),
                        os.path.join(self.home, "Documents"),
                        os.path.join(self.home, "Downloads"),
                        "C:\\", "D:\\"] + ([search_root] if search_root else [])

        for root in search_roots:
            candidate = os.path.join(root, p)
            if os.path.exists(candidate):
                return candidate

        # Last resort: search the home dir for a file/folder with this name
        found = self._find_item_by_name(p)
        if found:
            return found

        # Return as desktop-relative path (user probably means a file they'll create)
        return os.path.join(self.home, "Desktop", p)

    def _find_item_by_name(self, name: str, search_dir: str = None, max_results: int = 1) -> str:
        """Walk common directories to find a file or folder by name (case-insensitive)."""
        name_lower = name.lower()
        search_roots = [
            self.home,
            os.path.join(self.home, "Desktop"),
            os.path.join(self.home, "Documents"),
            os.path.join(self.home, "Downloads"),
            os.path.join(self.home, "Pictures"),
            os.path.join(self.home, "Videos"),
            os.path.join(self.home, "Music"),
        ]
        if search_dir:
            search_roots.insert(0, search_dir)

        for root in search_roots:
            if not os.path.exists(root):
                continue
            try:
                for item in os.listdir(root):
                    if item.lower() == name_lower or os.path.splitext(item)[0].lower() == name_lower:
                        return os.path.join(root, item)
            except PermissionError:
                pass

        # Deep search (limited)
        for root in search_roots:
            if not os.path.exists(root):
                continue
            try:
                for dirpath, dirnames, filenames in os.walk(root):
                    dirnames[:] = [d for d in dirnames if not d.startswith('.')]
                    for item in dirnames + filenames:
                        if item.lower() == name_lower or os.path.splitext(item)[0].lower() == name_lower:
                            return os.path.join(dirpath, item)
            except (PermissionError, OSError):
                pass
        return None

    def process_file_command(self, cmd: str) -> str:
        """Master dispatcher: parse any natural language file/folder command."""
        cmd_lower = cmd.lower().strip()

        # Quick keyword guards — only engage if file-management vocabulary present
        FILE_KEYWORDS = [
            "move", "copy", "paste", "cut", "delete", "remove", "rename",
            "create", "make", "new folder", "mkdir", "open folder", "open file",
            "list files", "show files", "list folder", "show folder", "what's in",
            "what is in", "find file", "search file", "search for file", "where is",
            "organize files", "organize folder", "sort files",
            "zip", "compress", "extract", "unzip",
            "rename", "duplicate",
            "disk space", "disk usage", "free space", "drive space", "storage",
            "file size", "file info", "file details", "size of",
            "empty recycle", "empty trash", "clear recycle",
            "recent files", "show recent",
            "read file", "open the file", "open the folder",
            "show hidden", "hide file",
        ]
        if not any(kw in cmd_lower for kw in FILE_KEYWORDS):
            return None

        # ------------------------------------------------------------------
        # 1. MOVE  — "move X from Y to Z" | "move X to Z"
        # ------------------------------------------------------------------
        move_m = re.search(
            r'move\s+(?:the\s+)?["\']?(.+?)["\']?\s+'
            r'(?:from\s+["\']?(.+?)["\']?\s+)?'
            r'(?:to|into|inside|in)\s+["\']?(.+?)["\']?$',
            cmd, re.IGNORECASE
        )
        if move_m:
            item_raw  = move_m.group(1).strip()
            from_raw  = move_m.group(2).strip() if move_m.group(2) else None
            to_raw    = move_m.group(3).strip()
            dest      = self._resolve_path(to_raw)
            if from_raw:
                src_dir = self._resolve_path(from_raw)
                src = os.path.join(src_dir, item_raw) if not os.path.isabs(item_raw) else item_raw
                if not os.path.exists(src):
                    src = self._find_item_by_name(item_raw, src_dir) or self._resolve_path(item_raw)
            else:
                src = self._resolve_path(item_raw)
            return self._move_item(src, dest)

        # ------------------------------------------------------------------
        # 2. COPY  — "copy X from Y to Z" | "copy X and paste into Z" | "copy X to Z"
        # ------------------------------------------------------------------
        copy_m = re.search(
            r'copy\s+(?:the\s+)?["\']?(.+?)["\']?\s+'
            r'(?:from\s+["\']?(.+?)["\']?\s+)?'
            r'(?:and\s+paste\s+(?:it\s+)?(?:in(?:to)?|to)\s+|to\s+|into\s+|in\s+)'
            r'["\']?(.+?)["\']?$',
            cmd, re.IGNORECASE
        )
        if copy_m:
            item_raw = copy_m.group(1).strip()
            from_raw = copy_m.group(2).strip() if copy_m.group(2) else None
            to_raw   = copy_m.group(3).strip()
            dest     = self._resolve_path(to_raw)
            if from_raw:
                src_dir = self._resolve_path(from_raw)
                src = os.path.join(src_dir, item_raw) if not os.path.isabs(item_raw) else item_raw
                if not os.path.exists(src):
                    src = self._find_item_by_name(item_raw, src_dir) or self._resolve_path(item_raw)
            else:
                src = self._resolve_path(item_raw)
            return self._copy_item(src, dest)

        # ------------------------------------------------------------------
        # 3. RENAME  — "rename X to Y" | "rename X file to Y"
        # ------------------------------------------------------------------
        rename_m = re.search(
            r'rename\s+(?:the\s+)?(?:file\s+|folder\s+)?["\']?(.+?)["\']?\s+to\s+["\']?(.+?)["\']?$',
            cmd, re.IGNORECASE
        )
        if rename_m:
            old_raw = rename_m.group(1).strip()
            new_name = rename_m.group(2).strip()
            old_path = self._resolve_path(old_raw)
            return self._rename_item(old_path, new_name)

        # ------------------------------------------------------------------
        # 4. DELETE / REMOVE
        # ------------------------------------------------------------------
        # "delete all files in X"
        del_all_m = re.search(
            r'(?:delete|remove|clear|wipe)\s+all\s+(?:files?|items?|contents?)(?:\s+(?:in|from|inside|of)\s+["\']?(.+?)["\']?)?$',
            cmd, re.IGNORECASE
        )
        if del_all_m:
            loc_raw = del_all_m.group(1).strip() if del_all_m.group(1) else "downloads"
            loc = self._resolve_path(loc_raw)
            return self._delete_all_in(loc)

        del_m = re.search(
            r'(?:delete|remove|trash|erase)\s+(?:the\s+)?(?:file\s+|folder\s+|directory\s+)?["\']?(.+?)["\']?$',
            cmd, re.IGNORECASE
        )
        if del_m:
            target_raw = del_m.group(1).strip()
            target = self._resolve_path(target_raw)
            return self._delete_item(target)

        # ------------------------------------------------------------------
        # 5. CREATE FOLDER
        # ------------------------------------------------------------------
        mkdir_m = re.search(
            r'(?:make|create|new|mkdir)\s+(?:a\s+)?(?:new\s+)?(?:folder|directory|dir)\s+'
            r'(?:called|named|with\s+name\s+)?["\']?(.+?)["\']?'
            r'(?:\s+(?:in|at|inside|on|under)\s+["\']?(.+?)["\']?)?$',
            cmd, re.IGNORECASE
        )
        if mkdir_m:
            name    = mkdir_m.group(1).strip()
            loc_raw = mkdir_m.group(2).strip() if mkdir_m.group(2) else "desktop"
            loc     = self._resolve_path(loc_raw)
            return self._create_folder(loc, name)

        # ------------------------------------------------------------------
        # 6. CREATE FILE  — "create a text file called X" / "create X.txt in documents"
        # ------------------------------------------------------------------
        mkfile_m = re.search(
            r'(?:create|make|new)\s+(?:a\s+)?(?:new\s+)?(?:text\s+)?(?:file|doc(?:ument)?|note)\s+'
            r'(?:called|named|with\s+name\s+)?["\']?(.+?)["\']?'
            r'(?:\s+(?:in|at|inside|on)\s+["\']?(.+?)["\']?)?$',
            cmd, re.IGNORECASE
        )
        if mkfile_m:
            name    = mkfile_m.group(1).strip()
            loc_raw = mkfile_m.group(2).strip() if mkfile_m.group(2) else "desktop"
            loc     = self._resolve_path(loc_raw)
            return self._create_file(loc, name)

        # ------------------------------------------------------------------
        # 7. LIST / SHOW FILES
        # ------------------------------------------------------------------
        list_m = re.search(
            r'(?:list|show|display|what(?:\'?s|\s+is)?\s+in|what\s+(?:files?|items?)\s+(?:are\s+)?in)\s+'
            r'(?:the\s+)?(?:files?|contents?|items?|folders?)?\s*'
            r'(?:in|from|of|on|inside)?\s*["\']?(.+?)["\']?$',
            cmd, re.IGNORECASE
        )
        if list_m or "list files" in cmd_lower or "show files" in cmd_lower or "show folder" in cmd_lower:
            if list_m:
                loc_raw = list_m.group(1).strip()
            else:
                dir_m2 = re.search(r'(?:in|from|of|on)\s+["\']?(.+?)["\']?$', cmd, re.IGNORECASE)
                loc_raw = dir_m2.group(1).strip() if dir_m2 else "desktop"
            loc = self._resolve_path(loc_raw)
            return self._list_files(loc)

        # ------------------------------------------------------------------
        # 8. FIND / SEARCH FILE
        # ------------------------------------------------------------------
        find_m = re.search(
            r'(?:find|search(?:\s+for)?|locate|where(?:\s+is)?)\s+'
            r'(?:the\s+)?(?:file\s+|folder\s+)?["\']?(.+?)["\']?'
            r'(?:\s+(?:in|from|on|at)\s+["\']?(.+?)["\']?)?$',
            cmd, re.IGNORECASE
        )
        if find_m and ("find" in cmd_lower or "search" in cmd_lower or "where" in cmd_lower or "locate" in cmd_lower):
            query   = find_m.group(1).strip()
            loc_raw = find_m.group(2).strip() if find_m.group(2) else None
            loc     = self._resolve_path(loc_raw) if loc_raw else self.home
            return self._search_files(query, loc)

        # ------------------------------------------------------------------
        # 9. OPEN FILE / FOLDER
        # ------------------------------------------------------------------
        open_f_m = re.search(
            r'open\s+(?:the\s+)?(?:file\s+|folder\s+|directory\s+)?["\']?(.+?)["\']?$',
            cmd, re.IGNORECASE
        )
        if open_f_m and ("open file" in cmd_lower or "open folder" in cmd_lower or "open the file" in cmd_lower or "open the folder" in cmd_lower):
            target_raw = open_f_m.group(1).strip()
            target = self._resolve_path(target_raw)
            return self._open_item(target)

        # ------------------------------------------------------------------
        # 10. DUPLICATE
        # ------------------------------------------------------------------
        dup_m = re.search(
            r'duplicate\s+(?:the\s+)?(?:file\s+|folder\s+)?["\']?(.+?)["\']?$',
            cmd, re.IGNORECASE
        )
        if dup_m:
            target_raw = dup_m.group(1).strip()
            target = self._resolve_path(target_raw)
            return self._duplicate_item(target)

        # ------------------------------------------------------------------
        # 11. ZIP / COMPRESS
        # ------------------------------------------------------------------
        zip_m = re.search(
            r'(?:zip|compress|archive)\s+(?:the\s+)?(?:file\s+|folder\s+)?["\']?(.+?)["\']?'
            r'(?:\s+(?:to|into|in)\s+["\']?(.+?)["\']?)?$',
            cmd, re.IGNORECASE
        )
        if zip_m:
            target_raw = zip_m.group(1).strip()
            out_raw    = zip_m.group(2).strip() if zip_m.group(2) else None
            target     = self._resolve_path(target_raw)
            out_path   = self._resolve_path(out_raw) if out_raw else None
            return self._zip_item(target, out_path)

        # ------------------------------------------------------------------
        # 12. EXTRACT / UNZIP
        # ------------------------------------------------------------------
        unzip_m = re.search(
            r'(?:extract|unzip|decompress|unarchive)\s+(?:the\s+)?["\']?(.+?)["\']?'
            r'(?:\s+(?:to|into|in)\s+["\']?(.+?)["\']?)?$',
            cmd, re.IGNORECASE
        )
        if unzip_m:
            src_raw  = unzip_m.group(1).strip()
            out_raw  = unzip_m.group(2).strip() if unzip_m.group(2) else None
            src      = self._resolve_path(src_raw)
            out_path = self._resolve_path(out_raw) if out_raw else os.path.dirname(src)
            return self._extract_zip(src, out_path)

        # ------------------------------------------------------------------
        # 13. ORGANIZE FILES
        # ------------------------------------------------------------------
        org_m = re.search(
            r'(?:organize|sort|clean\s+up)\s+(?:the\s+)?(?:files?|folder)?\s*'
            r'(?:in|on|at|of)?\s*["\']?(.+?)["\']?$',
            cmd, re.IGNORECASE
        )
        if org_m and ("organize" in cmd_lower or "sort files" in cmd_lower or "clean up" in cmd_lower):
            loc_raw = org_m.group(1).strip() if org_m.group(1) else "desktop"
            loc     = self._resolve_path(loc_raw)
            return self._organize_files(loc)

        # ------------------------------------------------------------------
        # 14. DISK SPACE / STORAGE INFO
        # ------------------------------------------------------------------
        if any(kw in cmd_lower for kw in ["disk space", "disk usage", "free space", "drive space", "storage", "how much space", "storage info"]):
            drive_m2 = re.search(r'(?:on\s+|in\s+|of\s+)?([a-zA-Z])\s*(?:drive|disk|:\\?)?', cmd_lower)
            if drive_m2:
                drive = f"{drive_m2.group(1).upper()}:\\"
            else:
                drive = "C:\\"
            return self._disk_info(drive)

        # ------------------------------------------------------------------
        # 15. FILE SIZE / INFO
        # ------------------------------------------------------------------
        size_m = re.search(
            r'(?:size(?:\s+of)?|info(?:rmation)?(?:\s+of)?|details?(?:\s+of)?|properties(?:\s+of)?)\s+'
            r'(?:the\s+)?(?:file\s+|folder\s+)?["\']?(.+?)["\']?$',
            cmd, re.IGNORECASE
        )
        if size_m and any(kw in cmd_lower for kw in ["size", "info", "details", "properties"]):
            target_raw = size_m.group(1).strip()
            target     = self._resolve_path(target_raw)
            return self._file_info(target)

        # ------------------------------------------------------------------
        # 16. EMPTY RECYCLE BIN
        # ------------------------------------------------------------------
        if any(kw in cmd_lower for kw in ["empty recycle", "empty trash", "clear recycle", "clear trash", "empty the recycle"]):
            return self._empty_recycle_bin()

        # ------------------------------------------------------------------
        # 17. RECENT FILES
        # ------------------------------------------------------------------
        if "recent files" in cmd_lower or "show recent" in cmd_lower or "last opened" in cmd_lower:
            return self._recent_files()

        # ------------------------------------------------------------------
        # 18. READ FILE CONTENT
        # ------------------------------------------------------------------
        read_m = re.search(
            r'(?:read|show\s+contents?\s+of|display\s+contents?\s+of|open\s+and\s+read)\s+'
            r'(?:the\s+)?(?:file\s+)?["\']?(.+?)["\']?$',
            cmd, re.IGNORECASE
        )
        if read_m and ("read file" in cmd_lower or "show contents" in cmd_lower or "display contents" in cmd_lower):
            target_raw = read_m.group(1).strip()
            target     = self._resolve_path(target_raw)
            return self._read_file(target)

        return None

    # ------------------------------------------------------------------
    # HELPER IMPLEMENTATIONS
    # ------------------------------------------------------------------

    def _move_item(self, src: str, dest: str) -> str:
        try:
            if not os.path.exists(src):
                found = self._find_item_by_name(os.path.basename(src))
                if found:
                    src = found
                else:
                    return f"❌ Source not found: {src}"
            os.makedirs(dest, exist_ok=True) if not os.path.exists(dest) and not os.path.splitext(dest)[1] else None
            if os.path.isdir(dest):
                dest_path = os.path.join(dest, os.path.basename(src))
            else:
                dest_path = dest
            shutil.move(src, dest_path)
            return f"✅ Moved \"{os.path.basename(src)}\" → \"{dest}\""
        except Exception as e:
            return f"❌ Move failed: {str(e)}"

    def _copy_item(self, src: str, dest: str) -> str:
        try:
            if not os.path.exists(src):
                found = self._find_item_by_name(os.path.basename(src))
                if found:
                    src = found
                else:
                    return f"❌ Source not found: {src}"
            os.makedirs(dest, exist_ok=True) if not os.path.exists(dest) and not os.path.splitext(dest)[1] else None
            if os.path.isdir(dest):
                dest_path = os.path.join(dest, os.path.basename(src))
            else:
                dest_path = dest
            if os.path.isdir(src):
                shutil.copytree(src, dest_path, dirs_exist_ok=True)
            else:
                shutil.copy2(src, dest_path)
            return f"✅ Copied \"{os.path.basename(src)}\" → \"{dest}\""
        except Exception as e:
            return f"❌ Copy failed: {str(e)}"

    def _rename_item(self, old_path: str, new_name: str) -> str:
        try:
            if not os.path.exists(old_path):
                found = self._find_item_by_name(os.path.basename(old_path))
                if found:
                    old_path = found
                else:
                    return f"❌ File/folder not found: {old_path}"
            dir_of = os.path.dirname(old_path)
            # Preserve extension if new_name has none and old does
            old_ext = os.path.splitext(old_path)[1]
            new_ext = os.path.splitext(new_name)[1]
            if old_ext and not new_ext:
                new_name = new_name + old_ext
            new_path = os.path.join(dir_of, new_name)
            os.rename(old_path, new_path)
            return f"✅ Renamed \"{os.path.basename(old_path)}\" → \"{new_name}\""
        except Exception as e:
            return f"❌ Rename failed: {str(e)}"

    def _delete_item(self, target: str) -> str:
        try:
            if not os.path.exists(target):
                found = self._find_item_by_name(os.path.basename(target))
                if found:
                    target = found
                else:
                    return f"❌ Not found: {target}"
            name = os.path.basename(target)
            if os.path.isdir(target):
                shutil.rmtree(target)
            else:
                os.remove(target)
            return f"🗑️ Deleted: \"{name}\""
        except Exception as e:
            return f"❌ Delete failed: {str(e)}"

    def _delete_all_in(self, dir_path: str) -> str:
        try:
            if not os.path.exists(dir_path):
                return f"❌ Directory not found: {dir_path}"
            count = 0
            errors = []
            for item in os.listdir(dir_path):
                full = os.path.join(dir_path, item)
                try:
                    if os.path.isdir(full):
                        shutil.rmtree(full)
                    else:
                        os.remove(full)
                    count += 1
                except Exception as e:
                    errors.append(item)
            result = f"🗑️ Deleted {count} items from \"{dir_path}\"."
            if errors:
                result += f" (Skipped {len(errors)}: {', '.join(errors[:3])})"
            return result
        except Exception as e:
            return f"❌ Delete all failed: {str(e)}"

    def _create_folder(self, loc: str, name: str) -> str:
        try:
            folder_path = os.path.join(loc, name)
            os.makedirs(folder_path, exist_ok=True)
            return f"📁 Folder created: \"{folder_path}\""
        except Exception as e:
            return f"❌ Failed to create folder: {str(e)}"

    def _create_file(self, loc: str, name: str) -> str:
        try:
            os.makedirs(loc, exist_ok=True)
            # Add .txt if no extension given
            if not os.path.splitext(name)[1]:
                name = name + ".txt"
            file_path = os.path.join(loc, name)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(f"# {os.path.splitext(name)[0]}\nCreated by JARVIS on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            return f"📄 File created: \"{file_path}\""
        except Exception as e:
            return f"❌ Failed to create file: {str(e)}"

    def _open_item(self, target: str) -> str:
        try:
            if not os.path.exists(target):
                found = self._find_item_by_name(os.path.basename(target))
                if found:
                    target = found
                else:
                    return f"❌ Not found: {target}"
            if self.platform == "win32":
                os.startfile(target)
            elif self.platform == "darwin":
                subprocess.Popen(["open", target])
            else:
                subprocess.Popen(["xdg-open", target])
            return f"📂 Opened: \"{target}\""
        except Exception as e:
            return f"❌ Could not open: {str(e)}"

    def _duplicate_item(self, target: str) -> str:
        try:
            if not os.path.exists(target):
                found = self._find_item_by_name(os.path.basename(target))
                if found:
                    target = found
                else:
                    return f"❌ Not found: {target}"
            base, ext = os.path.splitext(target)
            copy_path = f"{base}_copy{ext}"
            counter = 2
            while os.path.exists(copy_path):
                copy_path = f"{base}_copy{counter}{ext}"
                counter += 1
            if os.path.isdir(target):
                shutil.copytree(target, copy_path)
            else:
                shutil.copy2(target, copy_path)
            return f"📋 Duplicated: \"{os.path.basename(target)}\" → \"{os.path.basename(copy_path)}\""
        except Exception as e:
            return f"❌ Duplicate failed: {str(e)}"

    def _zip_item(self, target: str, out_path: str = None) -> str:
        try:
            if not os.path.exists(target):
                found = self._find_item_by_name(os.path.basename(target))
                if found:
                    target = found
                else:
                    return f"❌ Not found: {target}"
            base_name = os.path.splitext(os.path.basename(target))[0]
            if out_path is None:
                out_path = os.path.join(os.path.dirname(target), base_name + ".zip")
            elif os.path.isdir(out_path):
                out_path = os.path.join(out_path, base_name + ".zip")
            with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                if os.path.isdir(target):
                    for root, dirs, files in os.walk(target):
                        for file in files:
                            fp = os.path.join(root, file)
                            zf.write(fp, os.path.relpath(fp, os.path.dirname(target)))
                else:
                    zf.write(target, os.path.basename(target))
            size_mb = os.path.getsize(out_path) / (1024 * 1024)
            return f"🗜️ Compressed \"{os.path.basename(target)}\" → \"{out_path}\" ({size_mb:.2f} MB)"
        except Exception as e:
            return f"❌ Zip failed: {str(e)}"

    def _extract_zip(self, src: str, out_path: str) -> str:
        try:
            if not os.path.exists(src):
                found = self._find_item_by_name(os.path.basename(src))
                if found:
                    src = found
                else:
                    return f"❌ Archive not found: {src}"
            os.makedirs(out_path, exist_ok=True)
            with zipfile.ZipFile(src, 'r') as zf:
                zf.extractall(out_path)
            return f"📦 Extracted \"{os.path.basename(src)}\" → \"{out_path}\""
        except zipfile.BadZipFile:
            return f"❌ Not a valid zip file: {src}"
        except Exception as e:
            return f"❌ Extract failed: {str(e)}"

    def _list_files(self, dir_path: str) -> str:
        try:
            if not os.path.exists(dir_path):
                return f"❌ Directory not found: {dir_path}"
            items = sorted(os.listdir(dir_path))[:30]
            labeled = []
            for item in items:
                full = os.path.join(dir_path, item)
                if os.path.isdir(full):
                    count = len(os.listdir(full)) if os.path.exists(full) else 0
                    labeled.append(f"📁 {item}/ ({count} items)")
                else:
                    size = os.path.getsize(full)
                    labeled.append(f"📄 {item} ({self._fmt_size(size)})")
            total = len(os.listdir(dir_path))
            header = f"📂 {dir_path} — {total} item(s):"
            return header + "\n  " + "\n  ".join(labeled) if labeled else header + "\n  (empty)"
        except PermissionError:
            return f"❌ Access denied: {dir_path}"
        except Exception as e:
            return f"❌ Cannot list: {str(e)}"

    def _search_files(self, query: str, search_dir: str = None) -> str:
        try:
            results = []
            roots = [search_dir] if search_dir and os.path.exists(search_dir) else [
                self.home,
                os.path.join(self.home, "Desktop"),
                os.path.join(self.home, "Documents"),
                os.path.join(self.home, "Downloads"),
                os.path.join(self.home, "Pictures"),
            ]
            for root in roots:
                for dirpath, dirnames, filenames in os.walk(root):
                    dirnames[:] = [d for d in dirnames if not d.startswith('.')]
                    for item in dirnames + filenames:
                        if query.lower() in item.lower():
                            full = os.path.join(dirpath, item)
                            icon = "📁" if os.path.isdir(full) else "📄"
                            results.append(f"{icon} {full}")
                        if len(results) >= 15:
                            break
                    if len(results) >= 15:
                        break
            if results:
                return f"🔍 Found {len(results)} result(s) for \"{query}\":\n  " + "\n  ".join(results)
            return f"🔍 No files or folders found matching \"{query}\""
        except Exception as e:
            return f"❌ Search error: {str(e)}"

    def _organize_files(self, dir_path: str) -> str:
        if not os.path.exists(dir_path):
            return f"❌ Directory not found: {dir_path}"
        cats = {
            "Images":    ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff', '.raw', '.heic'],
            "Documents": ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.xls', '.pptx', '.ppt', '.csv', '.odt', '.rtf'],
            "Videos":    ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'],
            "Music":     ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'],
            "Code":      ['.js', '.py', '.java', '.cpp', '.c', '.html', '.css', '.ts', '.json', '.xml', '.sh', '.bat', '.ps1'],
            "Archives":  ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'],
            "Executables": ['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm'],
        }
        moved = 0
        try:
            for file in os.listdir(dir_path):
                full = os.path.join(dir_path, file)
                if os.path.isdir(full):
                    continue
                ext = os.path.splitext(file)[1].lower()
                cat = "Others"
                for c, exts in cats.items():
                    if ext in exts:
                        cat = c
                        break
                cat_dir = os.path.join(dir_path, cat)
                os.makedirs(cat_dir, exist_ok=True)
                shutil.move(full, os.path.join(cat_dir, file))
                moved += 1
            return f"✅ Organized {moved} file(s) into category folders in \"{dir_path}\"."
        except Exception as e:
            return f"❌ Organization failed: {str(e)}"

    def _disk_info(self, drive: str) -> str:
        try:
            usage = shutil.disk_usage(drive)
            total = usage.total / (1024 ** 3)
            used  = usage.used  / (1024 ** 3)
            free  = usage.free  / (1024 ** 3)
            pct   = (usage.used / usage.total) * 100
            bar   = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
            return (
                f"💾 Disk Info — {drive}\n"
                f"  Total : {total:.1f} GB\n"
                f"  Used  : {used:.1f} GB ({pct:.1f}%)\n"
                f"  Free  : {free:.1f} GB\n"
                f"  [{bar}]"
            )
        except Exception as e:
            return f"❌ Disk info error: {str(e)}"

    def _file_info(self, target: str) -> str:
        try:
            if not os.path.exists(target):
                found = self._find_item_by_name(os.path.basename(target))
                if found:
                    target = found
                else:
                    return f"❌ Not found: {target}"
            stat   = os.stat(target)
            size   = self._fmt_size(stat.st_size)
            mtime  = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
            ctime  = datetime.fromtimestamp(stat.st_ctime).strftime("%Y-%m-%d %H:%M:%S")
            kind   = "📁 Folder" if os.path.isdir(target) else f"📄 File ({os.path.splitext(target)[1] or 'no ext'})"
            info   = (
                f"{kind}: \"{os.path.basename(target)}\"\n"
                f"  Path     : {target}\n"
                f"  Size     : {size}\n"
                f"  Modified : {mtime}\n"
                f"  Created  : {ctime}"
            )
            if os.path.isdir(target):
                count = sum(len(f) for _, _, f in os.walk(target))
                info += f"\n  Files    : {count} total"
            return info
        except Exception as e:
            return f"❌ File info error: {str(e)}"

    def _empty_recycle_bin(self) -> str:
        try:
            if self.platform == "win32":
                subprocess.run(
                    'powershell -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"',
                    shell=True, capture_output=True
                )
                return "🗑️ Recycle Bin emptied successfully."
            elif self.platform == "darwin":
                subprocess.run(["osascript", "-e", 'tell application "Finder" to empty trash'])
                return "🗑️ Trash emptied successfully."
            else:
                trash = os.path.expanduser("~/.local/share/Trash")
                if os.path.exists(trash):
                    shutil.rmtree(os.path.join(trash, "files"), ignore_errors=True)
                    shutil.rmtree(os.path.join(trash, "info"), ignore_errors=True)
                return "🗑️ Trash emptied successfully."
        except Exception as e:
            return f"❌ Could not empty recycle bin: {str(e)}"

    def _recent_files(self, max_results: int = 10) -> str:
        try:
            recent = []
            scan_dirs = [
                self.home,
                os.path.join(self.home, "Desktop"),
                os.path.join(self.home, "Documents"),
                os.path.join(self.home, "Downloads"),
                os.path.join(self.home, "Pictures"),
            ]
            for d in scan_dirs:
                if not os.path.exists(d):
                    continue
                for f in os.listdir(d):
                    full = os.path.join(d, f)
                    if os.path.isfile(full):
                        recent.append((os.path.getmtime(full), full))
            recent.sort(reverse=True)
            top = recent[:max_results]
            if not top:
                return "📂 No recent files found."
            lines = []
            for mtime, path in top:
                t = datetime.fromtimestamp(mtime).strftime("%m/%d %H:%M")
                lines.append(f"  📄 {os.path.basename(path)} — {t} — {os.path.dirname(path)}")
            return f"🕒 {len(top)} Most Recent Files:\n" + "\n".join(lines)
        except Exception as e:
            return f"❌ Recent files error: {str(e)}"

    def _read_file(self, target: str, max_chars: int = 2000) -> str:
        try:
            if not os.path.exists(target):
                found = self._find_item_by_name(os.path.basename(target))
                if found:
                    target = found
                else:
                    return f"❌ File not found: {target}"
            if os.path.isdir(target):
                return self._list_files(target)
            size = os.path.getsize(target)
            if size > 1024 * 1024:  # >1MB
                return f"⚠️ File too large to read ({self._fmt_size(size)}). Use a text editor."
            with open(target, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read(max_chars)
            truncated = len(content) == max_chars
            header = f"📄 \"{os.path.basename(target)}\" ({self._fmt_size(size)}):"
            body = f"\n```\n{content}\n```"
            if truncated:
                body += f"\n... (truncated — showing first {max_chars} chars)"
            return header + body
        except UnicodeDecodeError:
            return f"❌ Cannot read binary file: {target}"
        except Exception as e:
            return f"❌ Read error: {str(e)}"

    def _fmt_size(self, size_bytes: int) -> str:
        """Human-readable file size."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} PB"

    # --- ADVANCED AI CODING AUTOMATION ---
    def generate_project(self, prompt: str, loc: str) -> str:
        try:
            target_dir = self._resolve_path(loc)
            os.makedirs(target_dir, exist_ok=True)
            logger.info(f"[Coding] Generating project in {target_dir} for prompt: {prompt}")

            sys_prompt = (
                "You are an expert AI software engineer. The user wants to generate a complete coding project. "
                "Output your response strictly as a JSON object where keys are relative file paths (e.g., 'index.html', 'src/main.py') "
                "and values are the raw string content of those files. Ensure the code is bug-free, complete, and fully functional. "
                "Do NOT use markdown outside the JSON, do NOT add explanations. Just return valid JSON."
            )

            response = llm_service.generate_response(prompt, sys_prompt)
            # Try to parse the JSON
            try:
                # Find the first { and last } to strip markdown wrappers
                start = response.find('{')
                end = response.rfind('}')
                if start != -1 and end != -1:
                    json_str = response[start:end+1]
                    import json
                    files_dict = json.loads(json_str)
                else:
                    raise ValueError("No JSON found")
            except Exception:
                # Fallback to saving raw output if JSON fails
                with open(os.path.join(target_dir, "generated_code.txt"), "w", encoding="utf-8") as f:
                    f.write(response)
                return f"✅ Generated project in {target_dir} (fallback to text file due to parsing issue)."

            count = 0
            for file_path, content in files_dict.items():
                full_path = os.path.join(target_dir, file_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "w", encoding="utf-8") as f:
                    f.write(content)
                count += 1
            
            return f"✅ Generated {count} files for your project in \"{target_dir}\"."
        except Exception as e:
            return f"❌ Project generation failed: {str(e)}"

    def autocomplete_code(self) -> str:
        try:
            import pyautogui
            import pyperclip
            
            # Save original clipboard
            orig_clip = pyperclip.paste()
            
            # Select all and copy
            pyautogui.hotkey('ctrl', 'a')
            time.sleep(0.1)
            pyautogui.hotkey('ctrl', 'c')
            time.sleep(0.2)
            
            code_text = pyperclip.paste()
            if not code_text or code_text == orig_clip:
                return "❌ Could not grab code from the active editor."
            
            logger.info("[Coding] Autocompleting code from active window...")
            
            sys_prompt = (
                "You are an expert AI code completion tool. "
                "Given the user's partial code, complete the logical implementation seamlessly. "
                "Output ONLY the complete code from start to finish so it can be pasted directly into the editor to replace the current text. "
                "DO NOT include markdown formatting like ```python, DO NOT include explanations."
            )
            
            completed_code = llm_service.generate_response(f"Complete this code:\n\n{code_text}", sys_prompt)
            
            # Strip markdown if present
            completed_code = re.sub(r"^```[a-zA-Z]*\n?", "", completed_code, flags=re.IGNORECASE)
            completed_code = re.sub(r"\n?```$", "", completed_code).strip()
            
            # Paste back
            pyperclip.copy(completed_code)
            time.sleep(0.1)
            pyautogui.hotkey('ctrl', 'v')
            time.sleep(0.1)
            
            # Restore clipboard
            pyperclip.copy(orig_clip)
            
            return "✅ Code auto-completed successfully in active editor."
        except Exception as e:
            return f"❌ Auto-complete failed: {str(e)}"

    def review_and_fix_code(self) -> str:
        try:
            import pyautogui
            import pyperclip
            
            orig_clip = pyperclip.paste()
            
            pyautogui.hotkey('ctrl', 'a')
            time.sleep(0.1)
            pyautogui.hotkey('ctrl', 'c')
            time.sleep(0.2)
            
            code_text = pyperclip.paste()
            if not code_text or code_text == orig_clip:
                return "❌ Could not grab code from the active editor."
            
            logger.info("[Coding] Reviewing and fixing code from active window...")
            
            sys_prompt = (
                "You are an expert AI debugger and code reviewer. "
                "Analyze the provided code, fix all syntax errors, logic bugs, and apply best practices. "
                "Output ONLY the complete, fixed code so it can replace the current text directly. "
                "DO NOT include markdown formatting like ```python, DO NOT include explanations."
            )
            
            fixed_code = llm_service.generate_response(f"Fix this code:\n\n{code_text}", sys_prompt)
            
            fixed_code = re.sub(r"^```[a-zA-Z]*\n?", "", fixed_code, flags=re.IGNORECASE)
            fixed_code = re.sub(r"\n?```$", "", fixed_code).strip()
            
            pyperclip.copy(fixed_code)
            time.sleep(0.1)
            pyautogui.hotkey('ctrl', 'v')
            time.sleep(0.1)
            
            pyperclip.copy(orig_clip)
            
            return "✅ Code reviewed and fixed successfully in active editor."
        except Exception as e:
            return f"❌ Code fix failed: {str(e)}"

# Singleton PC Control Service
pc_control_service = PCControlService()
