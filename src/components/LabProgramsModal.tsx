/**
 * Modern Clean Lab Programs Library Modal
 */

import React, { useState } from 'react';
import { LAB_PROGRAMS } from '../data/labExperiments';
import { LabProgram } from '../types/simulator';
import { hexWord, hexByte } from '../simulator/disassembler';
import { X, Download, Check, BookOpen } from 'lucide-react';

interface LabProgramsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProgram: (program: LabProgram) => void;
}

export const LabProgramsModal: React.FC<LabProgramsModalProps> = ({
  isOpen,
  onClose,
  onLoadProgram,
}) => {
  const [selectedProg, setSelectedProg] = useState<LabProgram>(LAB_PROGRAMS[0]);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoad = (prog: LabProgram) => {
    onLoadProgram(prog);
    setLoadedId(prog.id);
    setTimeout(() => {
      setLoadedId(null);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-text">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                8085 Laboratory Experiments
              </h2>
              <p className="text-xs text-zinc-400">
                Pre-compiled microprocessor programs ready to load, disassemble, and execute
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Left Sidebar List + Right Detail View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Programs Sidebar List */}
          <div className="w-full md:w-72 border-r border-zinc-800 bg-zinc-950/40 p-3 overflow-y-auto term-scrollbar shrink-0">
            <div className="flex flex-col gap-1">
              {LAB_PROGRAMS.map((prog) => (
                <button
                  key={prog.id}
                  onClick={() => setSelectedProg(prog)}
                  className={`text-left p-3 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    selectedProg.id === prog.id
                      ? 'bg-zinc-800 text-zinc-100 font-medium'
                      : 'hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="font-semibold text-zinc-200">{prog.title}</div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Start: {hexWord(prog.startAddress)}H · Size: {prog.bytes.length} bytes
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Program Detail View */}
          <div className="flex-1 p-6 overflow-y-auto term-scrollbar flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-zinc-100">
                  {selectedProg.title}
                </h3>
                <button
                  onClick={() => handleLoad(selectedProg)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-colors cursor-pointer shadow-sm"
                >
                  {loadedId === selectedProg.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Loaded to RAM</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Load into Memory</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {selectedProg.description}
              </p>
            </div>

            {/* Inputs & Outputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              <div>
                <span className="text-zinc-500 block mb-1 font-semibold text-[11px]">
                  INPUT OPERANDS
                </span>
                {selectedProg.sampleInputs && selectedProg.sampleInputs.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {selectedProg.sampleInputs.map((inp, idx) => (
                      <span key={idx} className="text-zinc-300">
                        {hexWord(inp.address)}H : {hexByte(inp.value)}H
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-400">{selectedProg.inputDescription || 'None'}</span>
                )}
              </div>

              <div>
                <span className="text-zinc-500 block mb-1 font-semibold text-[11px]">
                  EXPECTED OUTPUTS
                </span>
                {selectedProg.expectedOutputs && selectedProg.expectedOutputs.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {selectedProg.expectedOutputs.map((out, idx) => (
                      <span key={idx} className="text-amber-400">
                        {hexWord(out.address)}H : {out.description}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-400">{selectedProg.outputDescription || 'None'}</span>
                )}
              </div>
            </div>

            {/* Assembly Source Code Listing */}
            <div className="flex-1 flex flex-col">
              <span className="text-xs font-mono text-zinc-400 mb-2 font-medium">
                SOURCE LISTING
              </span>
              <pre className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-emerald-400/90 overflow-x-auto term-scrollbar leading-relaxed">
                {selectedProg.sourceCode}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
