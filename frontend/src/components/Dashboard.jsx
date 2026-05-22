import React from 'react';
import { Cpu, HardDrive, Shield, Activity, RefreshCw } from 'lucide-react';

export default function Dashboard({ stats }) {
  const cpuVal = stats?.cpu ?? 0;
  const ramVal = stats?.ram ?? 0;
  const diskVal = stats?.disk ?? 0;
  
  // Format uptime
  const formatUptime = (seconds) => {
    if (!seconds) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  return (
    <div className="glass-panel p-4 h-full flex flex-col justify-between overflow-hidden">
      <div className="flex justify-between items-center text-xs tracking-widest text-jarvis-muted font-bold uppercase mb-2">
        <span>📊 MISSION CONTROL</span>
        <div className="flex items-center gap-1.5 text-jarvis-cyan">
          <Activity size={12} className="animate-pulse" />
          <span className="mono">SYS FEED</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 flex-1 items-center">
        {/* CPU */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-jarvis-bg/30 border border-jarvis-cyan/5">
          <Cpu className="text-jarvis-cyan mb-1" size={16} />
          <span className="text-[10px] text-jarvis-muted uppercase tracking-wider font-bold">CPU LOAD</span>
          <div className="relative w-16 h-16 flex items-center justify-center mt-1">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="26" stroke="rgba(0, 212, 255, 0.05)" strokeWidth="4" fill="transparent" />
              <circle cx="32" cy="32" r="26" stroke="#00d4ff" strokeWidth="4" fill="transparent"
                      strokeDasharray={2 * Math.PI * 26}
                      strokeDashoffset={2 * Math.PI * 26 * (1 - cpuVal / 100)}
                      className="transition-all duration-500" />
            </svg>
            <span className="absolute text-xs font-bold mono">{cpuVal}%</span>
          </div>
        </div>

        {/* RAM */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-jarvis-bg/30 border border-jarvis-cyan/5">
          <RefreshCw className="text-jarvis-green mb-1 animate-[spin_8s_linear_infinite]" size={16} />
          <span className="text-[10px] text-jarvis-muted uppercase tracking-wider font-bold">MEMORY</span>
          <div className="relative w-16 h-16 flex items-center justify-center mt-1">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="26" stroke="rgba(0, 255, 136, 0.05)" strokeWidth="4" fill="transparent" />
              <circle cx="32" cy="32" r="26" stroke="#00ff88" strokeWidth="4" fill="transparent"
                      strokeDasharray={2 * Math.PI * 26}
                      strokeDashoffset={2 * Math.PI * 26 * (1 - ramVal / 100)}
                      className="transition-all duration-500" />
            </svg>
            <span className="absolute text-xs font-bold mono">{ramVal}%</span>
          </div>
        </div>

        {/* Disk */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-jarvis-bg/30 border border-jarvis-cyan/5">
          <HardDrive className="text-jarvis-yellow mb-1" size={16} />
          <span className="text-[10px] text-jarvis-muted uppercase tracking-wider font-bold">DISK</span>
          <div className="relative w-16 h-16 flex items-center justify-center mt-1">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="26" stroke="rgba(255, 204, 0, 0.05)" strokeWidth="4" fill="transparent" />
              <circle cx="32" cy="32" r="26" stroke="#ffcc00" strokeWidth="4" fill="transparent"
                      strokeDasharray={2 * Math.PI * 26}
                      strokeDashoffset={2 * Math.PI * 26 * (1 - diskVal / 100)}
                      className="transition-all duration-500" />
            </svg>
            <span className="absolute text-xs font-bold mono">{diskVal}%</span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-jarvis-cyan/10 flex flex-col gap-1.5 text-[10px] mono text-jarvis-muted">
        <div className="flex justify-between">
          <span>UPTIME:</span>
          <span className="text-jarvis-cyan font-bold">{formatUptime(stats?.uptime_seconds)}</span>
        </div>
        <div className="flex justify-between">
          <span>SECURITY STATUS:</span>
          <span className="text-jarvis-green flex items-center gap-1 font-bold">
            <Shield size={10} /> SECURE
          </span>
        </div>
        <div className="flex justify-between">
          <span>ORCHESTRATOR LINK:</span>
          <span className="text-jarvis-cyan font-bold">{stats?.connections ? 'ESTABLISHED' : 'DISCONNECTED'}</span>
        </div>
      </div>
    </div>
  );
}
