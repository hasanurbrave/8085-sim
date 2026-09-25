/**
 * Modern Clean Intel 8085 CPU Architecture & Pipeline Dashboard
 */

import React from 'react';
import { CPUState, BusState } from '../types/simulator';
import { hexByte, hexWord, disassembleInstruction } from '../simulator/disassembler';
import { Play, StepForward, RotateCcw } from 'lucide-react';

interface CpuArchitecturePanelProps {
  cpuState: CPUState;
  busState: BusState;
  readByte: (addr: number) => number;
  onStep: () => void;
  onGo: () => void;
  onReset: () => void;
}

export const CpuArchitecturePanel: React.FC<CpuArchitecturePanelProps> = ({
  cpuState,
  busState,
  readByte,
  onStep,
  onGo,
  onReset,
}) => {
  const currentInstruction = disassembleInstruction(readByte, cpuState.pc);

  const getByteBinary = (val: number): string => {
    return (val & 0xff).toString(2).padStart(8, '0');
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 bg-zinc-950 overflow-y-auto gap-6 select-text">
      {/* Header Bar & Control Group */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-zinc-100">
              Intel 8085A CPU Architecture
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium ${
                cpuState.halted
                  ? 'bg-rose-950/40 text-rose-400 border border-rose-800/60'
                  : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60'
              }`}
            >
              {cpuState.halted ? 'HALTED' : 'READY'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Register Array · Status Flip-Flops · Bus Matrix · Instruction Pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onStep}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 text-emerald-300 font-mono text-xs font-semibold transition-colors cursor-pointer"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span>Step (S)</span>
          </button>

          <button
            onClick={onGo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 text-rose-300 font-mono text-xs font-semibold transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run (G)</span>
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono text-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Registers & Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: Registers */}
        <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col gap-5">
          <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
            Internal Register Array
          </span>

          {/* Primary 8-Bit Registers: Accumulator & Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono text-zinc-400">ACCUMULATOR (A)</span>
                <span className="text-[11px] font-mono text-zinc-500">8-Bit Data</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl md:text-3xl font-mono font-bold text-amber-400">
                  {hexByte(cpuState.a)}H
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  Bin: {getByteBinary(cpuState.a)}
                </span>
              </div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono text-zinc-400">PSW / FLAGS (F)</span>
                <span className="text-[11px] font-mono text-zinc-500">S Z 0 AC 0 P 1 CY</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl md:text-3xl font-mono font-bold text-sky-400">
                  {hexByte(
                    (cpuState.flags.s ? 0x80 : 0) |
                      (cpuState.flags.z ? 0x40 : 0) |
                      (cpuState.flags.ac ? 0x10 : 0) |
                      (cpuState.flags.p ? 0x04 : 0) |
                      0x02 |
                      (cpuState.flags.cy ? 0x01 : 0)
                  )}H
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  {cpuState.flags.s ? 'S' : '-'}{cpuState.flags.z ? 'Z' : '-'}{cpuState.flags.ac ? 'A' : '-'}{cpuState.flags.p ? 'P' : '-'}{cpuState.flags.cy ? 'C' : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* General Purpose Register Pairs: BC, DE, HL */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* BC */}
            <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-2">
                <span>PAIR B–C</span>
                <span className="text-zinc-500">16-Bit</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="bg-zinc-900/80 p-2 rounded-lg">
                  <span className="text-[10px] text-zinc-500 block">B</span>
                  <span className="font-bold text-zinc-100">{hexByte(cpuState.b)}</span>
                </div>
                <div className="bg-zinc-900/80 p-2 rounded-lg">
                  <span className="text-[10px] text-zinc-500 block">C</span>
                  <span className="font-bold text-zinc-100">{hexByte(cpuState.c)}</span>
                </div>
              </div>
              <div className="text-[11px] font-mono text-zinc-400 text-center mt-2.5">
                BC = {hexWord((cpuState.b << 8) | cpuState.c)}H
              </div>
            </div>

            {/* DE */}
            <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-2">
                <span>PAIR D–E</span>
                <span className="text-zinc-500">16-Bit</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="bg-zinc-900/80 p-2 rounded-lg">
                  <span className="text-[10px] text-zinc-500 block">D</span>
                  <span className="font-bold text-zinc-100">{hexByte(cpuState.d)}</span>
                </div>
                <div className="bg-zinc-900/80 p-2 rounded-lg">
                  <span className="text-[10px] text-zinc-500 block">E</span>
                  <span className="font-bold text-zinc-100">{hexByte(cpuState.e)}</span>
                </div>
              </div>
              <div className="text-[11px] font-mono text-zinc-400 text-center mt-2.5">
                DE = {hexWord((cpuState.d << 8) | cpuState.e)}H
              </div>
            </div>

            {/* HL */}
            <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-2">
                <span>PAIR H–L</span>
                <span className="text-zinc-500">Pointer</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="bg-zinc-900/80 p-2 rounded-lg">
                  <span className="text-[10px] text-zinc-500 block">H</span>
                  <span className="font-bold text-zinc-100">{hexByte(cpuState.h)}</span>
                </div>
                <div className="bg-zinc-900/80 p-2 rounded-lg">
                  <span className="text-[10px] text-zinc-500 block">L</span>
                  <span className="font-bold text-zinc-100">{hexByte(cpuState.l)}</span>
                </div>
              </div>
              <div className="text-[11px] font-mono text-amber-400 text-center mt-2.5">
                M [HL] = {hexByte(readByte((cpuState.h << 8) | cpuState.l))}H
              </div>
            </div>
          </div>

          {/* Program Counter & Stack Pointer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-zinc-400 block mb-0.5">
                  PROGRAM COUNTER (PC)
                </span>
                <span className="text-xl font-mono font-bold text-emerald-400">
                  {hexWord(cpuState.pc)}H
                </span>
              </div>
              <span className="text-xs font-mono text-zinc-500">Next Instruction</span>
            </div>

            <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-zinc-400 block mb-0.5">
                  STACK POINTER (SP)
                </span>
                <span className="text-xl font-mono font-bold text-sky-400">
                  {hexWord(cpuState.sp)}H
                </span>
              </div>
              <span className="text-xs font-mono text-zinc-500">Top of Stack</span>
            </div>
          </div>
        </div>

        {/* Section 2: Flag Register Bits */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider block mb-4">
              Status Flags Register (F)
            </span>

            <div className="flex flex-col gap-2.5 font-mono">
              {/* Sign Flag */}
              <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                <div>
                  <span className="font-semibold text-zinc-200">[S] Sign Flag</span>
                  <span className="text-[11px] text-zinc-500 block">MSB bit 7 of ALU</span>
                </div>
                <span
                  className={`w-8 h-7 rounded-md flex items-center justify-center font-bold text-sm ${
                    cpuState.flags.s
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'bg-zinc-900 text-zinc-600'
                  }`}
                >
                  {cpuState.flags.s ? '1' : '0'}
                </span>
              </div>

              {/* Zero Flag */}
              <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                <div>
                  <span className="font-semibold text-zinc-200">[Z] Zero Flag</span>
                  <span className="text-[11px] text-zinc-500 block">Result equals 00H</span>
                </div>
                <span
                  className={`w-8 h-7 rounded-md flex items-center justify-center font-bold text-sm ${
                    cpuState.flags.z
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-zinc-900 text-zinc-600'
                  }`}
                >
                  {cpuState.flags.z ? '1' : '0'}
                </span>
              </div>

              {/* Auxiliary Carry Flag */}
              <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                <div>
                  <span className="font-semibold text-zinc-200">[AC] Aux Carry</span>
                  <span className="text-[11px] text-zinc-500 block">Bit 3 to 4 carry (DAA)</span>
                </div>
                <span
                  className={`w-8 h-7 rounded-md flex items-center justify-center font-bold text-sm ${
                    cpuState.flags.ac
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                      : 'bg-zinc-900 text-zinc-600'
                  }`}
                >
                  {cpuState.flags.ac ? '1' : '0'}
                </span>
              </div>

              {/* Parity Flag */}
              <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                <div>
                  <span className="font-semibold text-zinc-200">[P] Parity Flag</span>
                  <span className="text-[11px] text-zinc-500 block">Even number of set 1s</span>
                </div>
                <span
                  className={`w-8 h-7 rounded-md flex items-center justify-center font-bold text-sm ${
                    cpuState.flags.p
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                      : 'bg-zinc-900 text-zinc-600'
                  }`}
                >
                  {cpuState.flags.p ? '1' : '0'}
                </span>
              </div>

              {/* Carry Flag */}
              <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                <div>
                  <span className="font-semibold text-zinc-200">[CY] Carry Flag</span>
                  <span className="text-[11px] text-zinc-500 block">Carry / Borrow out of bit 7</span>
                </div>
                <span
                  className={`w-8 h-7 rounded-md flex items-center justify-center font-bold text-sm ${
                    cpuState.flags.cy
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                      : 'bg-zinc-900 text-zinc-600'
                  }`}
                >
                  {cpuState.flags.cy ? '1' : '0'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800 text-xs font-mono text-zinc-400 flex justify-between">
            <span>T-States: {cpuState.cycles}</span>
            <span>Instructions: {cpuState.instructionsExecuted}</span>
          </div>
        </div>
      </div>

      {/* Instruction Pipeline Decoder & Bus Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instruction Decoder */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
          <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider block mb-3">
            Instruction Pipeline (PC @ {hexWord(cpuState.pc)}H)
          </span>
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col gap-2 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-amber-300">
                {currentInstruction.mnemonic}
              </span>
              <span className="text-xs text-zinc-400">
                Bytes: {currentInstruction.bytes.length}
              </span>
            </div>
            <div className="text-xs text-zinc-400">
              Machine Code: <span className="text-zinc-100 font-bold">{currentInstruction.hexStr}</span>
            </div>
            <div className="text-xs text-zinc-400">
              Description: <span className="text-zinc-300">{currentInstruction.comment || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Bus Matrix */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
          <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider block mb-3">
            Bus Activity & Control Signals
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono text-center">
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block mb-0.5">ADDRESS BUS</span>
              <span className="font-bold text-zinc-100">{hexWord(busState.address)}H</span>
            </div>
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block mb-0.5">DATA BUS</span>
              <span className="font-bold text-zinc-100">{hexByte(busState.data)}H</span>
            </div>
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block mb-0.5">CYCLE TYPE</span>
              <span className="font-bold text-sky-400">{busState.operation}</span>
            </div>
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block mb-0.5">IO / M</span>
              <span className="font-bold text-zinc-100">{busState.iom ? 'IO' : 'MEM'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
