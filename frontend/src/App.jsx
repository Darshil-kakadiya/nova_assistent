import React, { useState, useEffect, useRef, useCallback } from 'react';
import Orb from './components/Orb';
import Radar from './components/Radar';
import Dashboard from './components/Dashboard';
import Terminal from './components/Terminal';
import { 
  Shield, Cpu, Wifi, WifiOff, X, Minus, Square, HardDrive, 
  RefreshCw, Send, Volume2, Mic, MicOff, Activity, Sparkles, Smartphone, 
  Settings, Compass, Sliders, Play, Trash2, Plus, Zap, AlertTriangle, HelpCircle
} from 'lucide-react';

// ── Voice Activation Button (HUD center panel) ─────────────────────────────
function VoiceActivationButton({ onCommand }) {
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        if (transcript) onCommand(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
    return () => recognitionRef.current?.abort();
  }, [onCommand]);

  const toggle = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  if (!voiceSupported) return null;

  return (
    <button
      onClick={toggle}
      className={`mt-4 px-8 py-3 rounded-full border-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
        isListening
          ? 'bg-jarvis-red/20 border-jarvis-red text-jarvis-red shadow-[0_0_24px_rgba(255,68,102,0.5)] animate-pulse'
          : 'bg-jarvis-cyan/10 border-jarvis-cyan/40 text-jarvis-cyan hover:bg-jarvis-cyan/20 hover:shadow-[0_0_18px_rgba(0,212,255,0.3)]'
      }`}
    >
      {isListening ? <><MicOff size={16} /> STOP LISTENING</> : <><Mic size={16} /> ACTIVATE VOICE</>}
    </button>
  );
}
// ──────────────────────────────────────────────────────────────────────────────

export default function App() {
  // Navigation & States
  const [activeTab, setActiveTab] = useState('hud'); // hud, security, mobile, routines, future
  const [stats, setStats] = useState({ cpu: 0, ram: 0, disk: 0, battery: '100%', mobile_battery: 'Disconnected', uptime_seconds: 0 });
  const [orbState, setOrbState] = useState('idle');
  const [logFeed, setLogFeed] = useState([
    { type: 'system', text: 'Initializing JARVIS AI Neural Networks...', timestamp: new Date().toLocaleTimeString() }
  ]);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [currentAgent, setCurrentAgent] = useState('Prime');
  const [selectedAgentTab, setSelectedAgentTab] = useState(null);

  // Security Scan States
  const [securityLog, setSecurityLog] = useState('');
  const [isScanningSec, setIsScanningSec] = useState(false);

  // Mobile inputs
  const [phoneNum, setPhoneNum] = useState('');
  const [smsMsg, setSmsMsg] = useState('');

  // Routine States
  const [routines, setRoutines] = useState([]);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineTrigger, setNewRoutineTrigger] = useState('');
  const [newRoutineCmd, setNewRoutineCmd] = useState('');

  // Future Tech states
  const [iotBulb, setIotBulb] = useState(true);
  const [iotTemp, setIotTemp] = useState(22);
  const [droneAltitude, setDroneAltitude] = useState(0);

  const wsRef = useRef(null);

  // Window actions
  const handleMinimize = () => { if (window.require) window.require('electron').ipcRenderer.send('window-minimize'); };
  const handleMaximize = () => { if (window.require) window.require('electron').ipcRenderer.send('window-maximize'); };
  const handleClose = () => { if (window.require) window.require('electron').ipcRenderer.send('window-close'); };

  // Fetch Routines
  const fetchRoutines = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/automation/routines');
      const data = await res.json();
      setRoutines(data);
    } catch (e) {
      console.warn("Could not fetch routines:", e);
    }
  };

  // Connect WebSockets
  const connectWebSocket = () => {
    setWsStatus('connecting');
    const ws = new WebSocket('ws://127.0.0.1:8000/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      setLogFeed(prev => [...prev, {
        type: 'system',
        text: '🔌 Core server synchronization established. Multi-Agent array ready.',
        timestamp: new Date().toLocaleTimeString()
      }]);
      fetchRoutines();
    };

    ws.onmessage = (event) => {
      const packet = JSON.parse(event.data);
      if (packet.type === 'welcome') {
        setLogFeed(prev => [...prev, {
          type: 'system',
          text: `🤖 ${packet.message}`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      } else if (packet.type === 'stats') {
        setStats({
          cpu: packet.cpu,
          ram: packet.ram,
          disk: packet.disk,
          battery: packet.battery,
          mobile_battery: packet.mobile_battery,
          uptime_seconds: packet.uptime_seconds
        });
      } else if (packet.type === 'status') {
        if (packet.status === 'processing') {
          setOrbState('processing');
        }
      } else if (packet.type === 'response') {
        setOrbState('speaking');
        setCurrentAgent(packet.agent);
        setLogFeed(prev => [...prev, {
          type: 'response',
          agent: packet.agent,
          text: packet.response,
          timestamp: new Date().toLocaleTimeString(),
          tag: 'DECISION'
        }]);
        setTimeout(() => setOrbState('idle'), Math.max(2000, packet.response.length * 45));
      }
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      setTimeout(connectWebSocket, 5000);
    };
  };

  useEffect(() => {
    connectWebSocket();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  const sendCommand = (cmdText) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setLogFeed(prev => [...prev, {
        type: 'user',
        text: cmdText,
        timestamp: new Date().toLocaleTimeString(),
        tag: 'REQUEST'
      }]);
      setOrbState('listening');
      wsRef.current.send(JSON.stringify({ type: 'command', text: cmdText }));
    }
  };

  // Run Security Scan
  const handleSecurityScan = async () => {
    setIsScanningSec(true);
    setSecurityLog("Initializing threat monitoring algorithms...\nQuerying Ultron Agent security protocol...");
    try {
      const res = await fetch('http://127.0.0.1:8000/security/diagnostics');
      const data = await res.json();
      setSecurityLog(data.report);
    } catch (e) {
      setSecurityLog("❌ Port scanning pipeline failed to bind to endpoint.");
    }
    setIsScanningSec(false);
  };

  // Mobile ADB Quick commands
  const handleMobileToggle = async (feature, state) => {
    sendCommand(`tell veronica to toggle mobile ${feature} ${state ? 'on' : 'off'}`);
  };

  const handleMobileDial = () => {
    if (!phoneNum) return;
    sendCommand(`tell veronica to dial phone number ${phoneNum}`);
  };

  const handleMobileSMS = () => {
    if (!phoneNum || !smsMsg) return;
    sendCommand(`tell veronica to send sms to ${phoneNum} saying ${smsMsg}`);
  };

  // Create Routine
  const handleAddRoutine = async (e) => {
    e.preventDefault();
    if (!newRoutineName || !newRoutineTrigger || !newRoutineCmd) return;
    try {
      const res = await fetch('http://127.0.0.1:8000/automation/routines/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoutineName,
          trigger_type: 'time',
          trigger_value: newRoutineTrigger,
          action: newRoutineCmd
        })
      });
      if (res.ok) {
        setNewRoutineName('');
        setNewRoutineTrigger('');
        setNewRoutineCmd('');
        fetchRoutines();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Remove Routine
  const handleRemoveRoutine = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/automation/routines/remove/${id}`, { method: 'POST' });
      fetchRoutines();
    } catch (e) {
      console.error(e);
    }
  };

  // Stark Future Tech control
  const triggerFutureControl = async (device, action, value) => {
    try {
      await fetch('http://127.0.0.1:8000/future/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device, action, value })
      });
    } catch (e) {
      console.warn("Future control endpoint unresponsive.", e);
    }
  };

  // 22 Agents list
  const agents = [
    { name: "Jarvis Prime", desc: "Orchestration brain", character: "System manager & dispatcher" },
    { name: "FRIDAY", desc: "Natural conversationalist", character: "Emotion, tone & pacing engine" },
    { name: "Daily Intel", desc: "Briefings scheduler", character: "Morning briefings & digests" },
    { name: "Veronica", desc: "Communication link", character: "SMS, Email, WhatsApp automator" },
    { name: "Content + Comms", desc: "Copywriting writer", character: "Social captions & scripts" },
    { name: "Vision", desc: "Camera & OCR scanner", character: "Screenshot & webcam analyzer" },
    { name: "Research + OSINT", desc: "OSINT web researcher", character: "Deep search intelligence" },
    { name: "Ultron Security", desc: "Ethical hacking guide", character: "Threat monitor & diagnostics" },
    { name: "Athena", desc: "Productivity coach", character: "Strategic action planning" },
    { name: "Stark", desc: "Business intelligence", character: "Financial dashboards & stock reviews" },
    { name: "Steve", desc: "AI developer & coder", character: "Workspace file edits & developer tools" },
    { name: "Oracle", desc: "Pipeline trigger", character: "Workflow webhook runner" },
    { name: "Gecko", desc: "Crypto & Stock tracker", character: "Live ticker data feed" },
    { name: "Hercules", desc: "Fitness & diet log", character: "Workout & macro plans" },
    { name: "Pepper", desc: "Journal & support log", character: "Mental health reflection support" },
    { name: "Hulk", desc: "Emergency fallback", character: "Critical offline diagnostics" },
    { name: "Herald", desc: "Meeting scheduler", character: "Notes & calendar sync" },
    { name: "Jerome", desc: "Spotify entertainment", character: "YouTube play & Spotify controller" },
    { name: "Phantom", desc: "Silent monitor", character: "Background process script automation" },
    { name: "Sentinel", desc: "Hardware diagnostics", character: "CPU/RAM/GPU usage monitoring" },
    { name: "Nexus", desc: "Semantic graph memory", character: "Long term context storage" },
    { name: "Titan", desc: "Queue dispatcher", character: "Long-running autonomous runs" }
  ];

  return (
    <div className="h-screen w-screen bg-jarvis-bg/95 flex flex-col hologram-grid relative overflow-hidden border border-jarvis-cyan/30 rounded-xl shadow-cyan-glow">
      <div className="scan-line" />
      
      {/* FUTURISTIC TITLEBAR */}
      <header className="h-10 border-b border-jarvis-cyan/15 bg-jarvis-bg/40 flex items-center justify-between px-4 select-none titlebar-drag">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-jarvis-cyan animate-pulse" />
          <span className="text-xs uppercase tracking-[0.2em] font-extrabold text-jarvis-cyan glow-text-cyan flex items-center gap-1.5">
            JARVIS <span className="text-[10px] opacity-60">OS v2.0</span>
          </span>
        </div>

        {/* STATUS LIGHT */}
        <div className="flex items-center gap-2 titlebar-nodrag">
          <div className="flex items-center gap-1 text-[10px] mono text-jarvis-muted mr-4">
            {wsStatus === 'connected' ? (
              <span className="flex items-center gap-1 text-jarvis-green">
                <Wifi size={12} /> CORE ONLINE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-jarvis-red">
                <WifiOff size={12} /> CORE LINK LOST
              </span>
            )}
          </div>
          
          <button onClick={handleMinimize} className="p-1 hover:bg-jarvis-cyan/10 rounded transition-colors text-jarvis-muted hover:text-jarvis-cyan">
            <Minus size={12} />
          </button>
          <button onClick={handleMaximize} className="p-1 hover:bg-jarvis-cyan/10 rounded transition-colors text-jarvis-muted hover:text-jarvis-cyan">
            <Square size={10} />
          </button>
          <button onClick={handleClose} className="p-1 hover:bg-jarvis-red/20 rounded transition-colors text-jarvis-muted hover:text-jarvis-red">
            <X size={12} />
          </button>
        </div>
      </header>

      {/* INNER VIEWPORT WITH NAVIGATION BAR */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT BAR: OPERATIONAL MENU */}
        <nav className="w-16 border-r border-jarvis-cyan/10 bg-jarvis-bg/50 flex flex-col items-center py-4 gap-6 z-20">
          <button 
            onClick={() => setActiveTab('hud')}
            className={`p-2.5 rounded-lg border transition-all ${
              activeTab === 'hud' ? 'bg-jarvis-cyan/20 border-jarvis-cyan text-jarvis-cyan' : 'border-transparent text-jarvis-muted hover:text-jarvis-text'
            }`}
            title="Main Dashboard"
          >
            <Cpu size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`p-2.5 rounded-lg border transition-all ${
              activeTab === 'security' ? 'bg-jarvis-cyan/20 border-jarvis-cyan text-jarvis-cyan' : 'border-transparent text-jarvis-muted hover:text-jarvis-text'
            }`}
            title="Ultron Security Center"
          >
            <Shield size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('mobile')}
            className={`p-2.5 rounded-lg border transition-all ${
              activeTab === 'mobile' ? 'bg-jarvis-cyan/20 border-jarvis-cyan text-jarvis-cyan' : 'border-transparent text-jarvis-muted hover:text-jarvis-text'
            }`}
            title="Mobile Sync Panel"
          >
            <Smartphone size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('routines')}
            className={`p-2.5 rounded-lg border transition-all ${
              activeTab === 'routines' ? 'bg-jarvis-cyan/20 border-jarvis-cyan text-jarvis-cyan' : 'border-transparent text-jarvis-muted hover:text-jarvis-text'
            }`}
            title="Routines & Workflows"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('future')}
            className={`p-2.5 rounded-lg border transition-all ${
              activeTab === 'future' ? 'bg-jarvis-cyan/20 border-jarvis-cyan text-jarvis-cyan' : 'border-transparent text-jarvis-muted hover:text-jarvis-text'
            }`}
            title="Future Stark Tech"
          >
            <Compass size={20} />
          </button>
        </nav>

        {/* GRID LAYOUTS BASED ON ACTIVE TAB */}
        <div className="flex-1 p-4 grid grid-cols-12 gap-4 overflow-hidden relative z-10">
          
          {/* TAB 1: MAIN HUD */}
          {activeTab === 'hud' && (
            <>
              <div className="col-span-3 flex flex-col gap-4 overflow-hidden">
                <div className="h-1/2"><Dashboard stats={stats} /></div>
                <div className="h-1/2"><Radar /></div>
              </div>
              <div className="col-span-6 flex flex-col justify-between items-center glass-panel p-6 relative overflow-hidden bg-jarvis-bg/25">
                <div className="absolute top-3 left-4 text-xs font-bold tracking-widest text-jarvis-cyan opacity-80 flex items-center gap-1.5">
                  <Sparkles size={12} className="animate-spin" />
                  <span>NEURAL INTERACTION CENTER</span>
                </div>
                <div className="flex-1 w-full flex items-center justify-center flex-col">
                  <Orb state={orbState} />
                  <VoiceActivationButton onCommand={sendCommand} />
                </div>
                <div className="w-full text-center px-6">
                  <div className="text-[10px] tracking-wider text-jarvis-muted uppercase mb-1">Active Communication Mode</div>
                  <div className="text-sm font-semibold tracking-wide text-jarvis-cyan glow-text-cyan">
                    {orbState === 'idle' && 'Jarvis: Standing by for voice/text commands.'}
                    {orbState === 'listening' && 'Listening for input... speak or type now.'}
                    {orbState === 'processing' && 'Routing task to specialized agents...'}
                    {orbState === 'speaking' && 'Speaking audio response...'}
                  </div>
                </div>
              </div>
              <div className="col-span-3 glass-panel p-4 flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="flex justify-between items-center text-xs tracking-widest text-jarvis-muted font-bold uppercase mb-2">
                    <span>🤖 AGENTS DIRECTORY</span>
                    <span className="mono text-jarvis-cyan">22 TOTAL</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
                    {agents.map((a) => (
                      <button
                        key={a.name}
                        onClick={() => setSelectedAgentTab(a)}
                        className={`p-1.5 text-left rounded border transition-all ${
                          currentAgent.toLowerCase().includes(a.name.toLowerCase().split(' ')[0])
                            ? 'border-jarvis-cyan bg-jarvis-cyan/15 text-jarvis-cyan font-bold'
                            : 'border-jarvis-cyan/10 bg-jarvis-bg/30 text-jarvis-muted hover:border-jarvis-cyan/30 hover:text-jarvis-text'
                        }`}
                      >
                        <div className="text-[10px] truncate">{a.name}</div>
                        <div className="text-[8px] opacity-70 truncate">{a.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-28 border-t border-jarvis-cyan/10 pt-2.5 flex flex-col justify-between text-[10px]">
                  {selectedAgentTab ? (
                    <div>
                      <div className="font-bold text-jarvis-cyan text-[11px] mb-0.5">{selectedAgentTab.name}</div>
                      <div className="text-jarvis-text mb-1 leading-snug">{selectedAgentTab.character}</div>
                      <div className="text-jarvis-muted italic">Role: {selectedAgentTab.desc}</div>
                    </div>
                  ) : (
                    <div className="text-jarvis-muted flex items-center justify-center h-full italic">
                      Select an agent from the roster above to view credentials.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: SECURITY CENTER */}
          {activeTab === 'security' && (
            <>
              <div className="col-span-4 glass-panel p-4 flex flex-col gap-4 overflow-hidden">
                <div className="flex justify-between items-center text-xs tracking-widest text-jarvis-muted font-bold uppercase border-b border-jarvis-cyan/10 pb-2">
                  <span>🛡️ SECURITY CONTROLS</span>
                  <span className="text-jarvis-red">ULTRON PROTOCOL</span>
                </div>
                <button
                  onClick={handleSecurityScan}
                  disabled={isScanningSec}
                  className="w-full py-3 bg-jarvis-red/20 border border-jarvis-red/40 hover:bg-jarvis-red/35 hover:border-jarvis-red/60 text-jarvis-red font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Shield size={14} className={isScanningSec ? 'animate-spin' : ''} />
                  {isScanningSec ? "SCANNING NETWORK..." : "RUN MALWARE & PORT SCAN"}
                </button>
                <div className="flex-1 bg-jarvis-bg/30 border border-jarvis-cyan/5 rounded-lg p-3 text-xs mono space-y-3 overflow-y-auto no-scrollbar">
                  <div className="font-semibold text-jarvis-cyan mb-1 flex items-center gap-1.5">
                    <Activity size={12} className="animate-pulse text-jarvis-red" />
                    SECURITY EVENTS FEED
                  </div>
                  <div className="text-[10px] text-jarvis-muted space-y-1.5">
                    <div>[SYS] Firewall rules locked. DNS secure.</div>
                    <div>[IPS] Suspicious network activity filter: NOMINAL.</div>
                    <div>[PROC] Integrity scans complete. No miners found.</div>
                    <div>[ROOT] Process protection hooks: ARMED.</div>
                  </div>
                </div>
              </div>
              
              <div className="col-span-8 glass-panel p-4 flex flex-col gap-3 overflow-hidden">
                <div className="text-xs font-bold tracking-widest text-jarvis-muted uppercase border-b border-jarvis-cyan/10 pb-2">
                  🛡️ ULTRON SCAN OUTPUT REPORT
                </div>
                <div className="flex-1 bg-jarvis-bg/50 border border-jarvis-cyan/10 rounded-lg p-4 text-xs font-semibold mono text-jarvis-text whitespace-pre-wrap overflow-y-auto no-scrollbar select-text leading-relaxed">
                  {securityLog || "Ready to run ethical security check. Diagnostics will query local active network bindings, verify active port loads, and analyze processes for suspicious names."}
                </div>
              </div>
            </>
          )}

          {/* TAB 3: MOBILE SYNC */}
          {activeTab === 'mobile' && (
            <>
              <div className="col-span-4 glass-panel p-4 flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="text-xs font-bold tracking-widest text-jarvis-muted uppercase border-b border-jarvis-cyan/10 pb-2 mb-3">
                    📱 MOBILE DEVICE STATUS
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-jarvis-bg/30 rounded-lg border border-jarvis-cyan/5">
                    <Smartphone size={32} className="text-jarvis-cyan mb-2" />
                    <div className="text-xs font-bold">{stats.mobile_battery !== 'Disconnected' ? 'ANDROID DEVICE CONNECTED' : 'NO DEVICE LINKED'}</div>
                    <div className="text-[10px] text-jarvis-muted mt-1">BATTERY LEVEL: {stats.mobile_battery}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-jarvis-muted uppercase tracking-wider">Quick Toggles</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleMobileToggle('wifi', true)}
                      className="py-1.5 px-3 bg-jarvis-cyan/10 border border-jarvis-cyan/30 rounded-lg text-[10px] font-bold hover:bg-jarvis-cyan/25 transition-all text-center"
                    >
                      ENABLE WIFI
                    </button>
                    <button 
                      onClick={() => handleMobileToggle('bluetooth', true)}
                      className="py-1.5 px-3 bg-jarvis-cyan/10 border border-jarvis-cyan/30 rounded-lg text-[10px] font-bold hover:bg-jarvis-cyan/25 transition-all text-center"
                    >
                      ENABLE BT
                    </button>
                  </div>
                  <button 
                    onClick={() => sendCommand("tell veronica to open phone screen mirroring")}
                    className="w-full py-2 bg-jarvis-green/20 border border-jarvis-green/40 hover:bg-jarvis-green/35 text-jarvis-green text-xs font-bold rounded-lg uppercase tracking-wider transition-all"
                  >
                    LAUNCH SCRCPY MIRROR
                  </button>
                </div>
              </div>

              <div className="col-span-8 glass-panel p-4 flex flex-col gap-4 overflow-hidden">
                <div className="text-xs font-bold tracking-widest text-jarvis-muted uppercase border-b border-jarvis-cyan/10 pb-2">
                  📱 CELLULAR INTEGRATION AND TELEMETRY
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="flex flex-col gap-2 p-3 bg-jarvis-bg/30 border border-jarvis-cyan/5 rounded-lg">
                    <div className="text-[10px] font-bold text-jarvis-cyan">📞 DIAL VOICE CALLS</div>
                    <input 
                      type="text" 
                      placeholder="Phone Number (e.g. 9198765432)"
                      value={phoneNum}
                      onChange={(e) => setPhoneNum(e.target.value)}
                      className="w-full bg-jarvis-bg/50 border border-jarvis-cyan/20 rounded p-1.5 text-xs text-jarvis-text outline-none"
                    />
                    <button 
                      onClick={handleMobileDial}
                      className="py-1.5 bg-jarvis-cyan/20 hover:bg-jarvis-cyan/40 text-jarvis-cyan text-[10px] font-bold rounded"
                    >
                      INITIATE DIAL
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2 p-3 bg-jarvis-bg/30 border border-jarvis-cyan/5 rounded-lg">
                    <div className="text-[10px] font-bold text-jarvis-cyan">✉️ SEND SMS MESSAGE DRAFT</div>
                    <input 
                      type="text" 
                      placeholder="Number..."
                      value={phoneNum}
                      onChange={(e) => setPhoneNum(e.target.value)}
                      className="w-full bg-jarvis-bg/50 border border-jarvis-cyan/20 rounded p-1.5 text-xs text-jarvis-text outline-none"
                    />
                    <textarea 
                      placeholder="Message content..."
                      rows="2"
                      value={smsMsg}
                      onChange={(e) => setSmsMsg(e.target.value)}
                      className="w-full bg-jarvis-bg/50 border border-jarvis-cyan/20 rounded p-1.5 text-xs text-jarvis-text outline-none resize-none"
                    />
                    <button 
                      onClick={handleMobileSMS}
                      className="py-1.5 bg-jarvis-cyan/20 hover:bg-jarvis-cyan/40 text-jarvis-cyan text-[10px] font-bold rounded"
                    >
                      SEND SMS DRAFT
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 4: ROUTINES & WORKFLOWS */}
          {activeTab === 'routines' && (
            <>
              <div className="col-span-5 glass-panel p-4 flex flex-col justify-between overflow-hidden">
                <form onSubmit={handleAddRoutine} className="flex flex-col gap-3">
                  <div className="text-xs font-bold tracking-widest text-jarvis-muted uppercase border-b border-jarvis-cyan/10 pb-2">
                    ⚙️ REGISTER NEW WORKFLOW
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-jarvis-muted font-bold uppercase">Routine Name</label>
                    <input 
                      type="text" 
                      value={newRoutineName}
                      onChange={(e) => setNewRoutineName(e.target.value)}
                      placeholder="e.g. Night Lock"
                      className="w-full bg-jarvis-bg/50 border border-jarvis-cyan/20 rounded p-1.5 text-xs text-jarvis-text outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-jarvis-muted font-bold uppercase">Trigger Time (HH:MM)</label>
                    <input 
                      type="text" 
                      value={newRoutineTrigger}
                      onChange={(e) => setNewRoutineTrigger(e.target.value)}
                      placeholder="e.g. 23:00"
                      className="w-full bg-jarvis-bg/50 border border-jarvis-cyan/20 rounded p-1.5 text-xs text-jarvis-text outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-jarvis-muted font-bold uppercase">Target System Command</label>
                    <input 
                      type="text" 
                      value={newRoutineCmd}
                      onChange={(e) => setNewRoutineCmd(e.target.value)}
                      placeholder="e.g. system lock"
                      className="w-full bg-jarvis-bg/50 border border-jarvis-cyan/20 rounded p-1.5 text-xs text-jarvis-text outline-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2 bg-jarvis-cyan/20 hover:bg-jarvis-cyan/45 text-jarvis-cyan text-xs font-bold rounded-lg uppercase transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    ADD REGISTERED ROUTINE
                  </button>
                </form>
              </div>

              <div className="col-span-7 glass-panel p-4 flex flex-col gap-3 overflow-hidden">
                <div className="text-xs font-bold tracking-widest text-jarvis-muted uppercase border-b border-jarvis-cyan/10 pb-2">
                  ⚙️ ACTIVE AUTOMATION ROUTINES ({routines.length})
                </div>
                <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-2">
                  {routines.map((r) => (
                    <div key={r.id} className="flex justify-between items-center p-2.5 bg-jarvis-bg/40 border border-jarvis-cyan/10 rounded-lg hover:border-jarvis-cyan/30 transition-all">
                      <div>
                        <div className="text-xs font-bold text-jarvis-text">{r.name}</div>
                        <div className="text-[9px] text-jarvis-muted mt-0.5">TRIGGER: {r.trigger_type.toUpperCase()} @ {r.trigger_value} | CMD: {r.action}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="py-0.5 px-2 bg-jarvis-green/10 border border-jarvis-green/20 rounded text-[8px] text-jarvis-green font-bold">ACTIVE</span>
                        <button 
                          onClick={() => handleRemoveRoutine(r.id)}
                          className="p-1 hover:bg-jarvis-red/20 border border-transparent hover:border-jarvis-red/35 rounded text-jarvis-muted hover:text-jarvis-red transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 5: FUTURE STARK TECH */}
          {activeTab === 'future' && (
            <>
              <div className="col-span-6 glass-panel p-4 flex flex-col gap-4 overflow-hidden">
                <div className="text-xs font-bold tracking-widest text-jarvis-muted uppercase border-b border-jarvis-cyan/10 pb-2">
                  🛰️ STARK SMART HOME & IoT CONTROLS
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-jarvis-bg/30 border border-jarvis-cyan/5 rounded-lg">
                    <div>
                      <div className="text-xs font-bold text-jarvis-text">Ambient Room Lighting</div>
                      <div className="text-[9px] text-jarvis-muted">Toggle Stark Smart Home lightbulbs</div>
                    </div>
                    <button 
                      onClick={() => { setIotBulb(!iotBulb); triggerFutureControl("bulb", iotBulb ? "turn_off" : "turn_on", 0); }}
                      className={`py-1 px-3.5 rounded text-[10px] font-bold border transition-all ${
                        iotBulb ? 'bg-jarvis-green/15 border-jarvis-green text-jarvis-green' : 'bg-jarvis-red/15 border-jarvis-red text-jarvis-red'
                      }`}
                    >
                      {iotBulb ? "ON" : "OFF"}
                    </button>
                  </div>
                  
                  <div className="p-3 bg-jarvis-bg/30 border border-jarvis-cyan/5 rounded-lg space-y-2">
                    <div className="flex justify-between text-xs font-bold text-jarvis-text">
                      <span>Stark Thermostat</span>
                      <span className="text-jarvis-cyan">{iotTemp}°C</span>
                    </div>
                    <input 
                      type="range" 
                      min="16" 
                      max="30" 
                      value={iotTemp} 
                      onChange={(e) => { const v = parseInt(e.target.value); setIotTemp(v); triggerFutureControl("thermostat", "set_temp", v); }}
                      className="w-full accent-jarvis-cyan cursor-pointer"
                    />
                    <div className="text-[9px] text-jarvis-muted">Slide to command HVAC cooling core</div>
                  </div>
                </div>
              </div>

              <div className="col-span-6 glass-panel p-4 flex flex-col gap-4 overflow-hidden">
                <div className="text-xs font-bold tracking-widest text-jarvis-muted uppercase border-b border-jarvis-cyan/10 pb-2">
                  🛰️ STARK MARK-85 DRONE CONTROL HUD
                </div>
                <div className="flex-1 bg-jarvis-bg/40 border border-jarvis-cyan/10 rounded-lg p-3 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="flex items-center gap-1"><Zap size={10} className="text-jarvis-yellow animate-pulse" /> ENGINE LINK STATUS</span>
                    <span className="text-jarvis-green">CONNECTED (GPS SYNC)</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-6 py-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold mono text-jarvis-cyan">{droneAltitude}m</div>
                      <div className="text-[8px] text-jarvis-muted font-bold uppercase mt-1">ALTITUDE</div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button 
                        onClick={() => { const v = Math.min(100, droneAltitude + 5); setDroneAltitude(v); triggerFutureControl("drone", "altitude", v); }}
                        className="py-1 px-3 bg-jarvis-cyan/20 border border-jarvis-cyan/40 text-jarvis-cyan rounded text-[9px] font-bold hover:bg-jarvis-cyan/35 transition-all"
                      >
                        THRUST +5m
                      </button>
                      <button 
                        onClick={() => { const v = Math.max(0, droneAltitude - 5); setDroneAltitude(v); triggerFutureControl("drone", "altitude", v); }}
                        className="py-1 px-3 bg-jarvis-cyan/20 border border-jarvis-cyan/40 text-jarvis-cyan rounded text-[9px] font-bold hover:bg-jarvis-cyan/35 transition-all"
                      >
                        LAND -5m
                      </button>
                    </div>
                  </div>

                  <div className="text-[9px] text-jarvis-muted italic text-center border-t border-jarvis-cyan/5 pt-2">
                    Drone robotics APIs linked via virtual serial COM routing.
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* LOWER PANEL: Interactive Console */}
      <footer className="h-60 p-4 pt-0 relative z-10 flex gap-4 overflow-hidden">
        <div className="w-full">
          <Terminal logFeed={logFeed} onSendCommand={sendCommand} currentAgent={currentAgent} />
        </div>
      </footer>
    </div>
  );
}
