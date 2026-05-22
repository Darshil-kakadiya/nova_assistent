import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TermIcon, Send, Mic, MicOff } from 'lucide-react';

export default function Terminal({ logFeed, onSendCommand, currentAgent = 'JARVIS' }) {
  const [inputVal, setInputVal] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const terminalEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Auto scroll to bottom
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logFeed]);

  useEffect(() => {
    // Check Web Speech API support (works in Electron/Chromium natively)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInputVal(transcript);

        // Auto-send on final result
        if (event.results[event.results.length - 1].isFinal) {
          const finalText = transcript.trim();
          if (finalText) {
            onSendCommand(finalText);
            setInputVal('');
          }
          setIsListening(false);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onSendCommand]);

  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputVal('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cmd = inputVal.trim();
    if (!cmd) return;
    onSendCommand(cmd);
    setInputVal('');
  };

  return (
    <div className="glass-panel p-4 h-full flex flex-col justify-between overflow-hidden">
      {/* Title */}
      <div className="flex justify-between items-center text-xs tracking-widest text-jarvis-muted font-bold uppercase mb-2 border-b border-jarvis-cyan/10 pb-1.5">
        <span className="flex items-center gap-1.5">
          <TermIcon size={12} className="text-jarvis-cyan" />
          CORE TERMINAL
        </span>
        <div className="flex items-center gap-2">
          {isListening && (
            <span className="text-[9px] text-jarvis-red animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-jarvis-red rounded-full inline-block" />
              VOICE ACTIVE
            </span>
          )}
          <span className="mono text-[10px] text-jarvis-cyan">ACTIVE AGENT: {currentAgent}</span>
        </div>
      </div>

      {/* Log Feed */}
      <div className="flex-1 overflow-y-auto pr-1 mb-3 space-y-2 mono text-xs no-scrollbar select-text">
        <div className="text-jarvis-muted text-[10px]">
          [SYSTEM INITIALIZATION COMPLETED. WEBSOCKET SYNC ONLINE.]
        </div>
        
        {logFeed.map((item, idx) => (
          <div key={idx} className="leading-relaxed border-l-2 pl-2" style={{
            borderColor: item.type === 'user' ? '#00d4ff' : 
                         item.type === 'response' ? '#00ff88' : 
                         item.type === 'error' ? '#ff4466' : '#ffcc00'
          }}>
            <div className="flex justify-between text-[9px] text-jarvis-muted mb-0.5">
              <span>{item.timestamp || 'SYSTEM'}</span>
              <span>{item.tag || 'CORE'}</span>
            </div>
            
            {item.type === 'user' && (
              <span className="text-jarvis-cyan font-bold">USER &gt; {item.text}</span>
            )}
            {item.type === 'response' && (
              <div>
                <span className="text-jarvis-green font-bold">{item.agent || 'JARVIS'} &gt; </span>
                <span className="text-jarvis-text whitespace-pre-wrap">{item.text}</span>
              </div>
            )}
            {item.type === 'system' && (
              <span className="text-jarvis-yellow italic">{item.text}</span>
            )}
            {item.type === 'error' && (
              <span className="text-jarvis-red font-bold">ERROR &gt; {item.text}</span>
            )}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <div className={`flex-1 relative flex items-center bg-jarvis-bg/50 border rounded-lg overflow-hidden px-3 py-1.5 transition-all ${
          isListening 
            ? 'border-jarvis-red/60 shadow-[0_0_8px_rgba(255,68,102,0.3)]' 
            : 'border-jarvis-cyan/20 focus-within:border-jarvis-cyan/60'
        }`}>
          <span className="mono text-xs text-jarvis-cyan font-bold mr-2">JARVIS_OS&gt;</span>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={isListening ? "🎤 Listening for voice command..." : "Initialize command..."}
            className="flex-1 bg-transparent border-none outline-none text-xs mono text-jarvis-text placeholder-jarvis-muted"
          />
        </div>
        
        {/* Voice Toggle Button */}
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleVoice}
            title={isListening ? "Stop listening" : "Start voice input (Web Speech API)"}
            className={`p-2 rounded-lg border transition-all flex items-center justify-center ${
              isListening
                ? 'bg-jarvis-red/30 border-jarvis-red text-jarvis-red animate-pulse shadow-[0_0_12px_rgba(255,68,102,0.4)]'
                : 'bg-jarvis-cyan/10 border-jarvis-cyan/30 text-jarvis-muted hover:bg-jarvis-cyan/20 hover:text-jarvis-cyan'
            }`}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        )}

        <button
          type="submit"
          className="p-2 rounded-lg bg-jarvis-cyan/15 hover:bg-jarvis-cyan/30 text-jarvis-cyan border border-jarvis-cyan/30 transition-all flex items-center justify-center"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
