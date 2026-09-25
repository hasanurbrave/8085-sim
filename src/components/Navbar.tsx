/**
 * Modern Clean Navigation Bar adhering to Universal Frontend Design Constitution
 */

import React from 'react';
import {
  Terminal,
  Cpu,
  HardDrive,
  LayoutGrid,
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  HelpCircle,
} from 'lucide-react';
import { CRTColorTheme } from '../types/simulator';

interface NavbarProps {
  activeTab: 'terminal' | 'kit' | 'cpu' | 'memory';
  setActiveTab: (tab: 'terminal' | 'kit' | 'cpu' | 'memory') => void;
  colorTheme: CRTColorTheme;
  setColorTheme: (theme: CRTColorTheme) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  onResetCPU: () => void;
  onOpenLabModal: () => void;
  onOpenHelpModal: () => void;
  isHalted: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  colorTheme,
  setColorTheme,
  soundEnabled,
  setSoundEnabled,
  onResetCPU,
  onOpenLabModal,
  onOpenHelpModal,
  isHalted,
}) => {
  return (
    <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="font-semibold text-zinc-100 tracking-tight text-sm">
            ALS-SDA-85
          </span>
        </div>
        <span className="text-zinc-600 font-light text-sm hidden sm:inline">·</span>
        <span className="text-xs text-zinc-400 hidden sm:inline">
          8085 Microprocessor Workstation
        </span>
      </div>

      {/* Zone 2: Navigation Links / Segmented Control Tabs */}
      <nav className="flex items-center gap-1 p-1 bg-zinc-900/90 rounded-lg border border-zinc-800/80 text-xs">
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
            activeTab === 'terminal'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span>TALK Monitor</span>
        </button>

        <button
          onClick={() => setActiveTab('kit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
            activeTab === 'kit'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 text-rose-400" />
          <span>Trainer Kit</span>
        </button>

        <button
          onClick={() => setActiveTab('cpu')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
            activeTab === 'cpu'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-sky-400" />
          <span>Registers & ALU</span>
        </button>

        <button
          onClick={() => setActiveTab('memory')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
            activeTab === 'memory'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
          <span>64KB Memory</span>
        </button>
      </nav>

      {/* Zone 3: Primary Actions & Toggles */}
      <div className="flex items-center gap-2">
        {/* Terminal Color Theme Selector */}
        <select
          value={colorTheme}
          onChange={(e) => setColorTheme(e.target.value as CRTColorTheme)}
          aria-label="Terminal Color Theme"
          className="hidden md:block text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer"
        >
          <option value="amber">Theme: Amber</option>
          <option value="green">Theme: Emerald</option>
          <option value="cyan">Theme: Cyan</option>
          <option value="white">Theme: Monochrome</option>
        </select>

        {/* Audio Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Mute Audio Clicks & Beeps' : 'Enable Audio'}
          className="p-2 text-zinc-400 hover:text-zinc-200 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/80 transition-colors cursor-pointer"
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </button>

        {/* Lab Programs Quick Drawer */}
        <button
          onClick={onOpenLabModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-colors cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Lab Programs</span>
        </button>

        {/* Command Reference Help */}
        <button
          onClick={onOpenHelpModal}
          title="Command Reference Manual"
          className="p-2 text-zinc-400 hover:text-zinc-200 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/80 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Reset CPU Button */}
        <button
          onClick={onResetCPU}
          title="Reset 8085 CPU to initial state"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 rounded-md transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
};
