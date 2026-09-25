/**
 * Modern Clean 64KB Memory Inspector & Live Hex Editor
 */

import React, { useState } from 'react';
import { CPUState } from '../types/simulator';
import { hexByte, hexWord } from '../simulator/disassembler';
import { Search, ChevronLeft, ChevronRight, Edit3 } from 'lucide-react';

interface MemoryViewerProps {
  cpuState: CPUState;
  readByte: (addr: number) => number;
  writeByte: (addr: number, val: number) => void;
  onJumpToAddress?: (addr: number) => void;
}

export const MemoryViewer: React.FC<MemoryViewerProps> = ({
  cpuState,
  readByte,
  writeByte,
}) => {
  const [baseAddr, setBaseAddr] = useState<number>(0x9000);
  const [searchInput, setSearchInput] = useState<string>('9000');
  const [editingAddr, setEditingAddr] = useState<number | null>(null);
  const [editVal, setEditVal] = useState<string>('');

  const rowsCount = 16; // 16 rows * 16 bytes = 256 bytes per page

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const addr = parseInt(searchInput, 16);
    if (!isNaN(addr)) {
      setBaseAddr(addr & 0xfff0);
    }
  };

  const jumpTo = (addr: number) => {
    const clamped = addr & 0xfff0;
    setBaseAddr(clamped);
    setSearchInput(hexWord(clamped));
  };

  const handleByteClick = (addr: number) => {
    setEditingAddr(addr);
    setEditVal(hexByte(readByte(addr)));
  };

  const saveEdit = () => {
    if (editingAddr !== null) {
      const val = parseInt(editVal, 16);
      if (!isNaN(val)) {
        writeByte(editingAddr, val & 0xff);
      }
      setEditingAddr(null);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingAddr(null);
    }
  };

  // Generate 16 rows of 16 bytes
  const rows: { addr: number; bytes: number[] }[] = [];
  for (let r = 0; r < rowsCount; r++) {
    const rowAddr = (baseAddr + r * 16) & 0xffff;
    const bytes: number[] = [];
    for (let c = 0; c < 16; c++) {
      bytes.push(readByte((rowAddr + c) & 0xffff));
    }
    rows.push({ addr: rowAddr, bytes });
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 bg-zinc-950 overflow-hidden select-text">
      {/* Header & Quick Segment Jump Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <span>64KB System Memory Explorer</span>
            <span className="text-xs text-zinc-400 font-mono">
              [0000H–FFFFH]
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Full 16-bit address space · Live byte inspector and interactive editor
          </p>
        </div>

        {/* Quick Jump Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
          <button
            onClick={() => jumpTo(0x0000)}
            className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
          >
            0000H EPROM
          </button>
          <button
            onClick={() => jumpTo(0x03b4)}
            className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
          >
            03B4H DELAY
          </button>
          <button
            onClick={() => jumpTo(0x9000)}
            className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-800 font-medium transition-colors cursor-pointer"
          >
            9000H Code
          </button>
          <button
            onClick={() => jumpTo(0x9100)}
            className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
          >
            9100H Data
          </button>
          <button
            onClick={() => jumpTo(cpuState.pc)}
            className="px-2.5 py-1 rounded-md bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/60 transition-colors cursor-pointer"
          >
            PC ({hexWord(cpuState.pc)}H)
          </button>
          <button
            onClick={() => jumpTo(cpuState.sp)}
            className="px-2.5 py-1 rounded-md bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border border-sky-800/60 transition-colors cursor-pointer"
          >
            SP ({hexWord(cpuState.sp)}H)
          </button>
        </div>
      </div>

      {/* Address Search & Pagination */}
      <div className="flex items-center justify-between gap-4 py-3 shrink-0">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Address (e.g. 9000)"
              className="pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md font-mono text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 w-44"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md text-xs font-mono transition-colors cursor-pointer"
          >
            Jump
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <button
            onClick={() => jumpTo(baseAddr - 256)}
            className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            title="Previous Page (256 bytes)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            {hexWord(baseAddr)}H – {hexWord((baseAddr + 255) & 0xffff)}H
          </span>
          <button
            onClick={() => jumpTo(baseAddr + 256)}
            className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            title="Next Page (256 bytes)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modern Hex Dump & ASCII View */}
      <div className="flex-1 overflow-auto rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 font-mono text-xs term-scrollbar shadow-inner">
        <div className="min-w-[680px]">
          {/* Column Header */}
          <div className="grid grid-cols-[80px_repeat(16,1fr)_120px] gap-1 pb-2 border-b border-zinc-800/80 text-zinc-500 font-semibold text-center select-none">
            <span className="text-left text-zinc-400">ADDR</span>
            {[...Array(16)].map((_, i) => (
              <span key={i} className="text-zinc-400">
                {i.toString(16).toUpperCase().padStart(2, '0')}
              </span>
            ))}
            <span className="text-right text-zinc-400">ASCII</span>
          </div>

          {/* Rows */}
          {rows.map((row) => {
            const ascii = row.bytes
              .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
              .join('');

            return (
              <div
                key={row.addr}
                className="grid grid-cols-[80px_repeat(16,1fr)_120px] gap-1 py-1 border-b border-zinc-900/80 hover:bg-zinc-800/30 text-center items-center"
              >
                {/* Row Address */}
                <span className="text-left font-semibold text-zinc-400 select-none">
                  {hexWord(row.addr)}
                </span>

                {/* 16 Hex Bytes */}
                {row.bytes.map((b, colIdx) => {
                  const cellAddr = (row.addr + colIdx) & 0xffff;
                  const isPC = cellAddr === cpuState.pc;
                  const isSP = cellAddr === cpuState.sp;
                  const isEditing = editingAddr === cellAddr;

                  return (
                    <div
                      key={colIdx}
                      onClick={() => handleByteClick(cellAddr)}
                      className={`cursor-pointer rounded py-0.5 transition-colors relative ${
                        isPC
                          ? 'bg-amber-500/25 text-amber-300 font-bold ring-1 ring-amber-500/80'
                          : isSP
                          ? 'bg-sky-500/25 text-sky-300 font-bold ring-1 ring-sky-500/80'
                          : b !== 0
                          ? 'text-zinc-100 hover:bg-zinc-800'
                          : 'text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300'
                      }`}
                      title={`Address: ${hexWord(cellAddr)}H | Click to edit`}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value.toUpperCase())}
                          onBlur={saveEdit}
                          onKeyDown={handleEditKeyDown}
                          maxLength={2}
                          autoFocus
                          className="w-full text-center bg-amber-400 text-black font-bold outline-none rounded text-xs"
                        />
                      ) : (
                        hexByte(b)
                      )}
                    </div>
                  );
                })}

                {/* ASCII Dump */}
                <span className="text-right text-zinc-500 tracking-wider select-none">
                  {ascii}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-3 border-t border-zinc-800/80 mt-2 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-500" />
            <span>PC Pointer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-sky-500/30 border border-sky-500" />
            <span>SP Pointer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Edit3 className="w-3 h-3 text-zinc-400" />
            <span>Click any cell to edit</span>
          </div>
        </div>
        <span>Capacity: 65,536 Bytes</span>
      </div>
    </div>
  );
};
