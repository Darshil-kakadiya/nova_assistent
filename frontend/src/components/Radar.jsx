import React, { useEffect, useState } from 'react';

export default function Radar() {
  const [blips, setBlips] = useState([]);

  useEffect(() => {
    // Generate random blips periodically to simulate background monitoring
    const interval = setInterval(() => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 65; // Percentage radius
      const newBlip = {
        id: Math.random(),
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle),
        size: 3 + Math.random() * 5,
        type: Math.random() > 0.85 ? 'alert' : 'nominal'
      };
      setBlips((prev) => [...prev.slice(-6), newBlip]);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full glass-panel p-4 flex flex-col justify-between overflow-hidden">
      <div className="flex justify-between items-center text-xs tracking-widest text-jarvis-muted font-bold uppercase mb-2">
        <span>🛰️ RADAR DEPLOYMENT</span>
        <span className="text-jarvis-green animate-pulse">ACTIVE SCANNING</span>
      </div>

      <div className="relative flex-1 flex items-center justify-center">
        {/* Animated Sweep Radar Screen */}
        <div className="relative w-48 h-48 rounded-full border border-jarvis-cyan/30 bg-jarvis-bg/40 overflow-hidden shadow-cyan-glow">
          {/* Sweeper Line */}
          <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none origin-center"
               style={{
                 background: 'conic-gradient(from 0deg, rgba(0, 212, 255, 0.15) 0deg, rgba(0, 212, 255, 0.05) 90deg, transparent 180deg)',
                 animation: 'spin 4s linear infinite'
               }} />

          {/* Grid Rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 rounded-full border border-jarvis-cyan/15 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/5 h-3/5 rounded-full border border-jarvis-cyan/10 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/5 h-2/5 rounded-full border border-jarvis-cyan/10 pointer-events-none" />
          
          {/* Crosshairs */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-jarvis-cyan/10 pointer-events-none" />
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-jarvis-cyan/10 pointer-events-none" />

          {/* Active Blips */}
          {blips.map((b) => (
            <div
              key={b.id}
              className={`absolute rounded-full pointer-events-none animate-ping ${
                b.type === 'alert' ? 'bg-jarvis-red' : 'bg-jarvis-green'
              }`}
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: `${b.size}px`,
                height: `${b.size}px`,
                animationDuration: '2s'
              }}
            />
          ))}
          {blips.map((b) => (
            <div
              key={`core-${b.id}`}
              className={`absolute rounded-full pointer-events-none transition-opacity duration-[3000ms] ${
                b.type === 'alert' ? 'bg-jarvis-red' : 'bg-jarvis-green'
              }`}
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: `${b.size}px`,
                height: `${b.size}px`,
                transform: 'translate(-50%, -50%)',
                boxShadow: b.type === 'alert' ? '0 0 10px #ff4466' : '0 0 10px #00ff88'
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 text-[10px] mono text-jarvis-muted flex justify-between">
        <span>RANGE: 1.5M SEC</span>
        <span>SYS FREQ: 5.8GHZ</span>
      </div>
    </div>
  );
}
