/**
 * Modern Precision Microprocessor Trainer Kit (ALS-SDA-85)
 * Clean industrial instrument aesthetic with high-precision display and tactile keypad.
 */

import React, { useState } from 'react';
import { CPUState, BusState } from '../types/simulator';
import { hexByte, hexWord } from '../simulator/disassembler';
import { soundEngine } from '../simulator/audio';

interface TrainerKitViewProps {
  cpuState: CPUState;
  busState: BusState;
  readByte: (addr: number) => number;
  onSendCommand: (cmd: string) => void;
  onReset: () => void;
  onStep: () => void;
  onGo: (addr: number) => void;
}

export const TrainerKitView: React.FC<TrainerKitViewProps> = ({
  cpuState,
  busState,
  readByte,
  onSendCommand,
  onReset,
  onStep,
  onGo,
}) => {
  const [keypadBuffer, setKeypadBuffer] = useState<string>('');
  const [kitMode, setKitMode] = useState<'IDLE' | 'ADDR' | 'DATA' | 'REG'>('ADDR');
  const [activeAddress, setActiveAddress] = useState<number>(0x9000);

  const displayAddr = hexWord(activeAddress);
  const displayData = hexByte(readByte(activeAddress));

  const handleKeyClick = (key: string) => {
    soundEngine.playKeyClick();

    if (key === 'RESET') {
      setActiveAddress(0x9000);
      setKeypadBuffer('');
      setKitMode('ADDR');
      onReset();
      return;
    }

    if (key === 'STEP') {
      onStep();
      setActiveAddress(cpuState.pc);
      return;
    }

    if (key === 'GO') {
      onGo(activeAddress);
      return;
    }

    if (key === 'NEXT') {
      setActiveAddress((prev) => (prev + 1) & 0xffff);
      setKeypadBuffer('');
      return;
    }

    if (key === 'PREV') {
      setActiveAddress((prev) => (prev - 1) & 0xffff);
      setKeypadBuffer('');
      return;
    }

    if (key === 'EXAM_MEM') {
      setKitMode('ADDR');
      setKeypadBuffer('');
      onSendCommand(`M ${hexWord(activeAddress)}`);
      return;
    }

    if (key === 'EXAM_REG') {
      onSendCommand('X');
      return;
    }

    if (key === 'EXEC') {
      if (keypadBuffer) {
        const val = parseInt(keypadBuffer, 16);
        if (!isNaN(val)) {
          if (kitMode === 'ADDR') {
            setActiveAddress(val & 0xffff);
          } else if (kitMode === 'DATA') {
            onSendCommand(`${hexByte(val & 0xff)}`);
            setActiveAddress((prev) => (prev + 1) & 0xffff);
          }
        }
        setKeypadBuffer('');
      }
      return;
    }

    // Hex digit key pressed (0-F)
    if (/^[0-9A-F]$/i.test(key)) {
      const nextBuf = (keypadBuffer + key.toUpperCase()).slice(-4);
      setKeypadBuffer(nextBuf);
      if (kitMode === 'ADDR' && nextBuf.length === 4) {
        const addr = parseInt(nextBuf, 16);
        if (!isNaN(addr)) setActiveAddress(addr);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-zinc-950 overflow-y-auto">
      {/* Modern Instrument Enclosure */}
      <div className="w-full max-w-4xl bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col gap-6 text-zinc-100">
        {/* Chassis Top Bar: Model & Spec */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-lg md:text-xl font-bold font-mono tracking-tight text-zinc-100">
              ALS-SDA-85
            </span>
            <span className="text-zinc-600 font-light">·</span>
            <span className="text-xs font-mono text-zinc-400">
              Trainer Kit Instrument
            </span>
          </div>

          <div className="text-xs font-mono text-zinc-500 hidden sm:flex items-center gap-3">
            <span>RAM: 8000H–9FFFH</span>
            <span>·</span>
            <span>ROM: 0000H–1FFFH</span>
          </div>
        </div>

        {/* Display Module: 7-Segment Readout & Status Lights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center bg-zinc-950/80 p-5 rounded-xl border border-zinc-800/80">
          {/* LED Display Readout */}
          <div className="lg:col-span-2 flex items-center justify-around gap-6 bg-zinc-950 p-4 rounded-lg border border-zinc-800 shadow-inner">
            {/* Address Display (4 Digits) */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-mono tracking-widest text-zinc-400 mb-2">
                ADDRESS BUS [A15–A0]
              </span>
              <div className="flex gap-1.5 bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                {displayAddr.split('').map((char, idx) => (
                  <div
                    key={idx}
                    className="w-10 h-14 bg-black/90 rounded-md flex items-center justify-center font-segment text-3xl md:text-4xl text-rose-500 font-bold tracking-tight shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                  >
                    {char}
                  </div>
                ))}
              </div>
            </div>

            {/* Data Display (2 Digits) */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-mono tracking-widest text-zinc-400 mb-2">
                DATA BUS [D7–D0]
              </span>
              <div className="flex gap-1.5 bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                {displayData.split('').map((char, idx) => (
                  <div
                    key={idx}
                    className="w-10 h-14 bg-black/90 rounded-md flex items-center justify-center font-segment text-3xl md:text-4xl text-rose-500 font-bold tracking-tight shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                  >
                    {char}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Micro Status Indicators */}
          <div className="grid grid-cols-3 gap-3 bg-zinc-950/60 p-4 rounded-lg border border-zinc-800 text-center">
            {/* RUN */}
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full mb-1 transition-all ${
                  !cpuState.halted
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                    : 'bg-zinc-800'
                }`}
              />
              <span className="text-[10px] font-mono text-zinc-400">RUN</span>
            </div>

            {/* HALT */}
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full mb-1 transition-all ${
                  cpuState.halted
                    ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                    : 'bg-zinc-800'
                }`}
              />
              <span className="text-[10px] font-mono text-zinc-400">HALT</span>
            </div>

            {/* INTE */}
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full mb-1 transition-all ${
                  cpuState.interruptsEnabled
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                    : 'bg-zinc-800'
                }`}
              />
              <span className="text-[10px] font-mono text-zinc-400">INTE</span>
            </div>

            {/* ALE */}
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full mb-1 transition-all ${
                  busState.ale
                    ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                    : 'bg-zinc-800'
                }`}
              />
              <span className="text-[10px] font-mono text-zinc-400">ALE</span>
            </div>

            {/* RD / WR */}
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full mb-1 transition-all ${
                  busState.wr
                    ? 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]'
                    : 'bg-zinc-800'
                }`}
              />
              <span className="text-[10px] font-mono text-zinc-400">
                {busState.wr ? 'WR' : 'RD'}
              </span>
            </div>

            {/* RESET */}
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full mb-1 bg-zinc-800" />
              <span className="text-[10px] font-mono text-zinc-400">RST</span>
            </div>
          </div>
        </div>

        {/* Precision Keypad Matrix */}
        <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-zinc-950/40 p-5 rounded-xl border border-zinc-800/80">
          {/* Hexadecimal Digits (0 - F) */}
          <div className="w-full md:w-auto">
            <span className="text-xs font-mono text-zinc-400 block mb-2 font-medium">
              HEXADECIMAL KEYPAD
            </span>
            <div className="grid grid-cols-4 gap-2">
              {['C', 'D', 'E', 'F', '8', '9', 'A', 'B', '4', '5', '6', '7', '0', '1', '2', '3'].map(
                (k) => (
                  <button
                    key={k}
                    onClick={() => handleKeyClick(k)}
                    className="w-13 h-12 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-100 font-mono font-bold text-base border border-zinc-700/60 shadow-sm active:translate-y-0.5 transition-all flex items-center justify-center cursor-pointer"
                  >
                    {k}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Function / Command Keys */}
          <div className="w-full md:w-auto">
            <span className="text-xs font-mono text-zinc-400 block mb-2 font-medium">
              CONTROL & MONITOR
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleKeyClick('RESET')}
                className="w-24 h-12 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 font-mono text-xs font-bold border border-rose-800/50 shadow-sm active:translate-y-0.5 transition-all flex flex-col items-center justify-center cursor-pointer"
              >
                <span>RESET</span>
                <span className="text-[9px] text-rose-400/80 font-normal">CPU Reset</span>
              </button>

              <button
                onClick={() => handleKeyClick('EXAM_MEM')}
                className="w-24 h-12 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-amber-300 font-mono text-xs font-bold border border-zinc-700/60 shadow-sm active:translate-y-0.5 transition-all flex flex-col items-center justify-center cursor-pointer"
              >
                <span>EXAM MEM</span>
                <span className="text-[9px] text-zinc-400 font-normal">[M] Command</span>
              </button>

              <button
                onClick={() => handleKeyClick('EXAM_REG')}
                className="w-24 h-12 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-sky-300 font-mono text-xs font-bold border border-zinc-700/60 shadow-sm active:translate-y-0.5 transition-all flex flex-col items-center justify-center cursor-pointer"
              >
                <span>EXAM REG</span>
                <span className="text-[9px] text-zinc-400 font-normal">[X] Command</span>
              </button>

              <button
                onClick={() => handleKeyClick('GO')}
                className="w-24 h-12 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 font-mono text-xs font-bold border border-emerald-800/50 shadow-sm active:translate-y-0.5 transition-all flex flex-col items-center justify-center cursor-pointer"
              >
                <span>GO</span>
                <span className="text-[9px] text-emerald-400/80 font-normal">[G] Run</span>
              </button>

              <button
                onClick={() => handleKeyClick('STEP')}
                className="w-24 h-12 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 font-mono text-xs font-bold border border-emerald-800/50 shadow-sm active:translate-y-0.5 transition-all flex flex-col items-center justify-center cursor-pointer"
              >
                <span>STEP</span>
                <span className="text-[9px] text-emerald-400/80 font-normal">[S] Trace</span>
              </button>

              <button
                onClick={() => handleKeyClick('EXEC')}
                className="w-24 h-12 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 font-mono text-xs font-bold border border-amber-800/50 shadow-sm active:translate-y-0.5 transition-all flex flex-col items-center justify-center cursor-pointer"
              >
                <span>EXEC</span>
                <span className="text-[9px] text-amber-400/80 font-normal">Enter</span>
              </button>

              <button
                onClick={() => handleKeyClick('NEXT')}
                className="w-24 h-12 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold border border-zinc-700/60 shadow-sm active:translate-y-0.5 transition-all flex flex-col items-center justify-center cursor-pointer"
              >
                <span>NEXT +</span>
                <span className="text-[9px] text-zinc-400 font-normal">Addr +1</span>
              </button>

              <button
                onClick={() => handleKeyClick('PREV')}
                className="w-24 h-12 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold border border-zinc-700/60 shadow-sm active:translate-y-0.5 transition-all flex flex-col items-center justify-center cursor-pointer"
              >
                <span>PREV -</span>
                <span className="text-[9px] text-zinc-400 font-normal">Addr -1</span>
              </button>

              <button
                onClick={() => onSendCommand('Z 9000 9015')}
                className="w-24 h-12 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-cyan-300 font-mono text-xs font-bold border border-zinc-700/60 shadow-sm active:translate-y-0.5 transition-all flex flex-col items-center justify-center cursor-pointer"
              >
                <span>DISASM</span>
                <span className="text-[9px] text-cyan-400/80 font-normal">[Z] List</span>
              </button>
            </div>

            {keypadBuffer && (
              <div className="mt-2 text-right font-mono text-xs text-amber-400">
                Keypad Buffer: <span className="font-bold">{keypadBuffer}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
