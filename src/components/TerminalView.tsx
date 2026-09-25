/**
 * Modern Pro TALK Serial Monitor Terminal (ALS-SDA-85)
 * Inspired by modern developer consoles (Warp / Linear / VS Code Debugger).
 * Features live CPU state HUD, intelligent suggestions, command categories, and crystal-clear output formatting.
 */

import React, { useState, useEffect, useRef } from 'react';
import { TerminalLine, CRTColorTheme, MonitorMode, CPUState } from '../types/simulator';
import { hexByte, hexWord } from '../simulator/disassembler';
import {
  Play,
  StepForward,
  Copy,
  Trash2,
  Check,
  Search,
  ChevronRight,
  Terminal,
  Activity,
  Layers,
  HelpCircle,
  CornerDownLeft,
  XCircle,
} from 'lucide-react';

interface TerminalViewProps {
  lines: TerminalLine[];
  prompt: string;
  mode: MonitorMode;
  colorTheme: CRTColorTheme;
  cpuState: CPUState;
  readByte: (addr: number) => number;
  onSendCommand: (cmd: string) => void;
  onEscape: () => void;
  onSpacebar: () => void;
  onClear: () => void;
  scanlines: boolean;
  setScanlines: (val: boolean) => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  lines,
  prompt,
  mode,
  colorTheme,
  cpuState,
  readByte,
  onSendCommand,
  onEscape,
  onSpacebar,
  onClear,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [copied, setCopied] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new output
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, prompt]);

  // Focus input automatically
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onEscape();
      return;
    }

    if (e.key === ' ' && mode === 'MODIFY' && inputVal === '') {
      e.preventDefault();
      onSpacebar();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = inputVal;
      if (trimmed) {
        setHistory((prev) => [...prev, trimmed]);
      }
      setHistoryIdx(-1);
      setInputVal('');
      onSendCommand(trimmed);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInputVal(history[nextIdx] || '');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= history.length) {
        setHistoryIdx(-1);
        setInputVal('');
      } else {
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx] || '');
      }
      return;
    }
  };

  const copyLog = () => {
    const text = lines.map((l) => l.text).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Modern subtle color theme mappings
  const themeStyles: Record<
    CRTColorTheme,
    {
      textPrimary: string;
      textAccent: string;
      promptColor: string;
      badgeColor: string;
      cursorColor: string;
    }
  > = {
    amber: {
      textPrimary: 'text-amber-200/90',
      textAccent: 'text-amber-400 font-semibold',
      promptColor: 'text-amber-400',
      badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      cursorColor: 'bg-amber-400',
    },
    green: {
      textPrimary: 'text-emerald-200/90',
      textAccent: 'text-emerald-400 font-semibold',
      promptColor: 'text-emerald-400',
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      cursorColor: 'bg-emerald-400',
    },
    cyan: {
      textPrimary: 'text-cyan-200/90',
      textAccent: 'text-cyan-400 font-semibold',
      promptColor: 'text-cyan-400',
      badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      cursorColor: 'bg-cyan-400',
    },
    white: {
      textPrimary: 'text-zinc-200',
      textAccent: 'text-white font-semibold',
      promptColor: 'text-zinc-100',
      badgeColor: 'bg-zinc-800 text-zinc-200 border-zinc-700',
      cursorColor: 'bg-zinc-100',
    },
  };

  const curTheme = themeStyles[colorTheme] || themeStyles.amber;

  // Filter lines if search active
  const displayedLines = filterSearch.trim()
    ? lines.filter((l) => l.text.toLowerCase().includes(filterSearch.toLowerCase()))
    : lines;

  // Dynamic quick suggestions based on mode
  const getSuggestions = () => {
    if (mode === 'ASSEMBLE') {
      return ['MVI A, 05H', 'MVI B, 03H', 'ADD B', 'STA 9100H', 'HLT', 'EXIT'];
    }
    if (mode === 'MODIFY') {
      return ['Space (Next)', '- (Prev)', '00', 'FF', 'EXIT'];
    }
    return ['H', 'A 9000', 'Z 9000 9015', 'D 9000 9030', 'M 9000', 'X', 'S', 'G 9000'];
  };

  // Helper for mode pill
  const getModeBadge = () => {
    switch (mode) {
      case 'ASSEMBLE':
        return { label: 'ASSEMBLE MODE', color: 'bg-amber-500/15 text-amber-300 border-amber-500/40' };
      case 'MODIFY':
        return { label: 'MODIFY RAM', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' };
      case 'EXAMINE_REG':
        return { label: 'EXAMINE REG', color: 'bg-sky-500/15 text-sky-300 border-sky-500/40' };
      case 'PROMPT_PARAM':
        return { label: 'INPUT PARAM', color: 'bg-purple-500/15 text-purple-300 border-purple-500/40' };
      default:
        return { label: 'READY / COMMAND', color: 'bg-zinc-800 text-zinc-300 border-zinc-700' };
    }
  };

  const modeBadge = getModeBadge();

  return (
    <div
      className="flex-1 flex flex-col h-full bg-zinc-950 p-3 md:p-5 overflow-hidden select-text"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Top Live CPU Telemetry Strip (Integrated HUD) */}
      <div className="mb-3 bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0 shadow-sm">
        {/* Left: CPU Registers Snapshot */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-medium">PC:</span>
            <span className="text-emerald-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/80">
              {hexWord(cpuState.pc)}H
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-medium">SP:</span>
            <span className="text-sky-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/80">
              {hexWord(cpuState.sp)}H
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-medium">A:</span>
            <span className="text-amber-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/80">
              {hexByte(cpuState.a)}H
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-medium">BC:</span>
            <span className="text-zinc-200 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/80">
              {hexWord((cpuState.b << 8) | cpuState.c)}H
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-medium">DE:</span>
            <span className="text-zinc-200 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/80">
              {hexWord((cpuState.d << 8) | cpuState.e)}H
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-medium">HL:</span>
            <span className="text-zinc-200 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/80">
              {hexWord((cpuState.h << 8) | cpuState.l)}H
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5">
            <span className="text-zinc-500 font-medium">M[HL]:</span>
            <span className="text-amber-300 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/80">
              {hexByte(readByte((cpuState.h << 8) | cpuState.l))}H
            </span>
          </div>
        </div>

        {/* Right: CPU Flags & Quick Stepper Controls */}
        <div className="flex items-center gap-3">
          {/* Flags Badges */}
          <div className="flex items-center gap-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                cpuState.flags.s
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-950 text-zinc-600 border-zinc-800/80'
              }`}
              title="Sign Flag"
            >
              S
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                cpuState.flags.z
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-zinc-950 text-zinc-600 border-zinc-800/80'
              }`}
              title="Zero Flag"
            >
              Z
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                cpuState.flags.ac
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-zinc-950 text-zinc-600 border-zinc-800/80'
              }`}
              title="Auxiliary Carry Flag"
            >
              AC
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                cpuState.flags.p
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-zinc-950 text-zinc-600 border-zinc-800/80'
              }`}
              title="Parity Flag"
            >
              P
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                cpuState.flags.cy
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-zinc-950 text-zinc-600 border-zinc-800/80'
              }`}
              title="Carry Flag"
            >
              CY
            </span>
          </div>

          {/* Stepper Buttons directly on HUD */}
          <div className="flex items-center gap-1 border-l border-zinc-800 pl-3">
            <button
              onClick={() => onSendCommand('S')}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-950 hover:bg-zinc-800 text-emerald-300 border border-zinc-800 transition-colors cursor-pointer"
              title="Step instruction (S)"
            >
              <StepForward className="w-3 h-3" />
              <span>Step</span>
            </button>

            <button
              onClick={() => onSendCommand('G 9000')}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-950 hover:bg-zinc-800 text-rose-300 border border-zinc-800 transition-colors cursor-pointer"
              title="Run from 9000H (G 9000)"
            >
              <Play className="w-3 h-3" />
              <span>Go</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Terminal Workspace (Split: Main Console + Collapsible Quick Reference Drawer) */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Main Terminal Console Container */}
        <div className="flex-1 flex flex-col rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md shadow-xl overflow-hidden min-w-0">
          {/* Top Window Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-950/80 text-xs font-mono text-zinc-400 shrink-0">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-zinc-200 tracking-tight">
                TALK MONITOR
              </span>
              <span className="text-zinc-600 font-light">/</span>
              <span className={`text-[11px] px-2 py-0.5 rounded font-mono font-medium border ${modeBadge.color}`}>
                {modeBadge.label}
              </span>
            </div>

            {/* Actions: Search filter, Copy, Clear, Sidebar Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Filter console..."
                  className="pl-7 pr-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 w-36"
                />
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyLog();
                }}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                title="Copy Terminal Logs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Clear screen"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  sidebarOpen
                    ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                }`}
                title="Toggle Commands Drawer"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Scrollable Terminal Feed */}
          <div className="flex-1 p-4 md:p-5 overflow-y-auto term-scrollbar font-mono text-[13px] md:text-sm leading-relaxed">
            {displayedLines.map((l) => {
              let colorCls = curTheme.textPrimary;
              let bgCls = '';

              if (l.type === 'header') {
                colorCls = 'text-amber-400 font-semibold';
              } else if (l.type === 'system') {
                colorCls = 'text-sky-300 font-medium';
              } else if (l.type === 'error') {
                colorCls = 'text-rose-400 font-medium';
                bgCls = 'bg-rose-950/20 px-1 rounded';
              } else if (l.type === 'success') {
                colorCls = 'text-emerald-400';
              } else if (l.type === 'input') {
                colorCls = 'text-zinc-100 font-semibold';
                bgCls = 'bg-zinc-800/40 px-2 py-0.5 rounded my-1 border-l-2 border-amber-400';
              }

              return (
                <div
                  key={l.id}
                  className={`${colorCls} ${bgCls} whitespace-pre-wrap break-all tracking-normal select-text`}
                >
                  {l.text}
                </div>
              );
            })}

            <div ref={terminalEndRef} />
          </div>

          {/* Interactive Suggestions Chips (Above Input) */}
          <div className="px-4 py-1.5 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center gap-1.5 overflow-x-auto term-scrollbar shrink-0 text-xs font-mono">
            <span className="text-[11px] text-zinc-500 uppercase font-semibold mr-1 shrink-0">
              Suggestions:
            </span>
            {getSuggestions().map((s) => (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  if (s.startsWith('Space')) {
                    onSpacebar();
                  } else if (s.startsWith('-')) {
                    onSendCommand('-');
                  } else if (s === 'EXIT') {
                    onEscape();
                  } else {
                    onSendCommand(s);
                  }
                }}
                className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800/80 transition-colors whitespace-nowrap cursor-pointer hover:border-zinc-700"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Modern Interactive Command Dock (Warp / Raycast Style) */}
          <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/90 flex items-center gap-3 shrink-0">
            {/* Active Prompt Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs font-bold text-amber-400 shrink-0">
              <span>{prompt}</span>
            </div>

            {/* Input Element */}
            <div className="flex-1 relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                className={`w-full bg-transparent border-none outline-none ${curTheme.textPrimary} font-mono text-sm tracking-normal pr-14 placeholder-zinc-500`}
                placeholder={
                  mode === 'ASSEMBLE'
                    ? 'Type mnemonic (e.g. MVI A, 05H) or press Esc to exit...'
                    : mode === 'MODIFY'
                    ? 'Enter hex byte or press Spacebar for next (Esc to exit)...'
                    : 'Type monitor command (e.g. A 9000, Z 9000 9015, D, M, X, G, S, H)...'
                }
              />
              {/* Enter / Send Badge */}
              <button
                onClick={() => {
                  const trimmed = inputVal;
                  if (trimmed) setHistory((prev) => [...prev, trimmed]);
                  setInputVal('');
                  onSendCommand(trimmed);
                }}
                className="absolute right-0 flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[11px] transition-colors cursor-pointer border border-zinc-700"
                title="Execute command (Enter)"
              >
                <CornerDownLeft className="w-3 h-3" />
                <span>Enter</span>
              </button>
            </div>

            {/* Escape to exit button if in interactive mode */}
            {mode !== 'COMMAND' && (
              <button
                onClick={onEscape}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 font-mono text-xs transition-colors cursor-pointer shrink-0"
                title="Cancel / Terminate (Esc)"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Exit Mode</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Right Quick Commands Drawer */}
        {sidebarOpen && (
          <aside className="w-72 bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-4 shrink-0 overflow-y-auto term-scrollbar shadow-lg">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <span className="text-xs font-mono font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>Command Palette</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-500">ALS-SDA-85</span>
            </div>

            {/* Category: Program Development */}
            <div className="flex flex-col gap-1.5 font-mono text-xs">
              <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                Execution & Coding
              </span>

              <button
                onClick={() => onSendCommand('A 9000')}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-left border border-zinc-800 transition-colors cursor-pointer"
              >
                <div>
                  <span className="text-amber-300 font-bold block">[A] Assemble</span>
                  <span className="text-[10px] text-zinc-500">Line assembler at 9000H</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </button>

              <button
                onClick={() => onSendCommand('Z 9000 9015')}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-left border border-zinc-800 transition-colors cursor-pointer"
              >
                <div>
                  <span className="text-zinc-200 font-bold block">[Z] Disassemble</span>
                  <span className="text-[10px] text-zinc-500">Decode 9000H to 9015H</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </button>

              <button
                onClick={() => onSendCommand('S')}
                className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 text-left border border-emerald-800/40 transition-colors cursor-pointer"
              >
                <div>
                  <span className="text-emerald-300 font-bold block">[S] Single Step</span>
                  <span className="text-[10px] text-zinc-500">Execute 1 instruction</span>
                </div>
                <StepForward className="w-3.5 h-3.5 text-emerald-400" />
              </button>

              <button
                onClick={() => onSendCommand('G 9000')}
                className="flex items-center justify-between p-2 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-left border border-rose-800/40 transition-colors cursor-pointer"
              >
                <div>
                  <span className="text-rose-300 font-bold block">[G] Execute (Go)</span>
                  <span className="text-[10px] text-zinc-500">Run code at 9000H</span>
                </div>
                <Play className="w-3.5 h-3.5 text-rose-400" />
              </button>
            </div>

            {/* Category: Memory Inspection */}
            <div className="flex flex-col gap-1.5 font-mono text-xs">
              <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                Memory & Registers
              </span>

              <button
                onClick={() => onSendCommand('D 9000 9030')}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-left border border-zinc-800 transition-colors cursor-pointer"
              >
                <div>
                  <span className="text-zinc-200 font-bold block">[D] Memory Dump</span>
                  <span className="text-[10px] text-zinc-500">Dump 9000H - 9030H</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </button>

              <button
                onClick={() => onSendCommand('M 9000')}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-left border border-zinc-800 transition-colors cursor-pointer"
              >
                <div>
                  <span className="text-zinc-200 font-bold block">[M] Modify RAM</span>
                  <span className="text-[10px] text-zinc-500">Interactive byte editor</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </button>

              <button
                onClick={() => onSendCommand('X')}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-left border border-zinc-800 transition-colors cursor-pointer"
              >
                <div>
                  <span className="text-sky-300 font-bold block">[X] Examine Regs</span>
                  <span className="text-[10px] text-zinc-500">Inspect CPU registers & flags</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </button>

              <button
                onClick={() => onSendCommand('R 0000')}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-left border border-zinc-800 transition-colors cursor-pointer"
              >
                <div>
                  <span className="text-zinc-300 font-bold block">[R] EPROM Read</span>
                  <span className="text-[10px] text-zinc-500">Inspect system ROM routines</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </button>
            </div>

            {/* Category: Block Operations */}
            <div className="flex flex-col gap-1.5 font-mono text-xs">
              <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                Block Utilities
              </span>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onSendCommand('F 9000 9010 00')}
                  className="p-1.5 rounded bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] transition-colors cursor-pointer"
                  title="F <start> <end> <data>"
                >
                  [F] Fill Block
                </button>

                <button
                  onClick={() => onSendCommand('C 9000 9010')}
                  className="p-1.5 rounded bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] transition-colors cursor-pointer"
                  title="C <start> <end>"
                >
                  [C] Invert Bits
                </button>

                <button
                  onClick={() => onSendCommand('V 9000 9010 9500')}
                  className="p-1.5 rounded bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] transition-colors cursor-pointer"
                  title="V <srcStart> <srcEnd> <dest>"
                >
                  [V] Move Block
                </button>

                <button
                  onClick={() => onSendCommand('H')}
                  className="p-1.5 rounded bg-zinc-950 hover:bg-zinc-800 text-amber-300 border border-zinc-800 text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>[H] Manual</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
